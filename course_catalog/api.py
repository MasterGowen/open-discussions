"""
course_catalog api functions
"""
import pdftotext
from datetime import datetime
import json
import logging

import boto3
from django.db import transaction
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from ocw_data_parser import OCWParser
import pytz

from course_catalog.constants import (
    PlatformType,
    NON_COURSE_DIRECTORIES,
    AvailabilityType,
    OfferedBy,
)
from course_catalog.etl.loaders import load_offered_bys
from course_catalog.models import Bootcamp, LearningResourceRun, Course, CourseRunFile
from course_catalog.serializers import (
    BootcampSerializer,
    OCWSerializer,
    LearningResourceRunSerializer,
)
from course_catalog.utils import get_course_url, load_course_blacklist
from search.task_helpers import (
    delete_course,
    upsert_course,
    index_new_bootcamp,
    update_bootcamp,
)
from search.tasks import upsert_course_run_file

log = logging.getLogger(__name__)


def safe_load_json(json_string, json_file_key):
    """
    Loads the passed string as a JSON object with exception handing and logging.
    Some OCW JSON content may be malformed.

    Args:
        json_string (str): The JSON contents as a string
        json_file_key (str): file ID for the JSON file

    Returns:
        JSON (dict): the JSON contents as JSON
    """
    try:
        loaded_json = json.loads(json_string)
        return loaded_json
    except json.JSONDecodeError:
        log.exception("%s has a corrupted JSON", json_file_key)
        return {}


def digest_ocw_course(master_json, last_modified, is_published, course_prefix=""):
    """
    Takes in OCW course master json to store it in DB

    Args:
        master_json (dict): course master JSON object as an output from ocw-data-parser
        last_modified (datetime): timestamp of latest modification of all course files
        is_published (bool): Flags OCW course as published or not
        course_prefix (str): (Optional) String used to query S3 bucket for course raw JSONs
    """
    if "course_id" not in master_json:
        log.error("Course %s is missing 'course_id'", master_json.get("uid"))
        return

    course_instance = Course.objects.filter(
        platform=PlatformType.ocw.value, course_id=master_json["course_id"]
    ).first()

    ocw_serializer = OCWSerializer(
        data={
            **master_json,
            "last_modified": last_modified,
            "is_published": True,  # This will be updated after all course runs are serialized
            "course_prefix": course_prefix,
            "raw_json": master_json,  # This is slightly cleaner than popping the extra fields inside the serializer
        },
        instance=course_instance,
    )
    if not ocw_serializer.is_valid():
        log.error(
            "Course %s is not valid: %s %s",
            master_json.get("uid"),
            ocw_serializer.errors,
            master_json.get("image_src"),
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        course = ocw_serializer.save()
        load_offered_bys(course, [{"name": OfferedBy.ocw.value}])

        # Try and get the run instance.
        courserun_instance = course.runs.filter(
            platform=PlatformType.ocw.value, run_id=master_json.get("uid")
        ).first()
        run_serializer = LearningResourceRunSerializer(
            data={
                **master_json,
                "platform": PlatformType.ocw.value,
                "key": master_json.get("uid"),
                "is_published": is_published,
                "staff": master_json.get("instructors"),
                "seats": [{"price": "0.00", "mode": "audit", "upgrade_deadline": None}],
                "content_language": master_json.get("language"),
                "short_description": master_json.get("description"),
                "level_type": master_json.get("course_level"),
                "year": master_json.get("from_year"),
                "semester": master_json.get("from_semester"),
                "availability": AvailabilityType.current.value,
                "image": {
                    "src": master_json.get("image_src"),
                    "description": master_json.get("image_description"),
                },
                "max_modified": last_modified,
                "content_type": ContentType.objects.get(model="course").id,
                "object_id": course.id,
                "url": get_course_url(
                    master_json.get("uid"), master_json, PlatformType.ocw.value
                ),
            },
            instance=courserun_instance,
        )
        if not run_serializer.is_valid():
            log.error(
                "OCW LearningResourceRun %s is not valid: %s",
                master_json.get("key"),
                run_serializer.errors,
            )
            return
        run = run_serializer.save()
        load_offered_bys(run, [{"name": OfferedBy.ocw.value}])


def get_s3_object_and_read(obj, iteration=0):
    """
    Attempts to read S3 data, and tries again up to MAX_S3_GET_ITERATIONS if it encounters an error.
    This helps to prevent read timeout errors from stopping sync.

    Args:
        obj (s3.ObjectSummary): The S3 ObjectSummary we are trying to read
        iteration (int): A number tracking how many times this function has been run

    Returns:
        The string contents of a json file read from S3
    """
    try:
        return obj.get()["Body"].read()
    except Exception:  # pylint: disable=broad-except
        if iteration < settings.MAX_S3_GET_ITERATIONS:
            return get_s3_object_and_read(obj, iteration + 1)
        else:
            raise


def format_date(date_str):
    """
    Coverts date from 2016/02/02 20:28:06 US/Eastern to 2016-02-02 20:28:06-05:00

    Args:
        date_str (String): Datetime object as string in the following format (2016/02/02 20:28:06 US/Eastern)
    Returns:
        Datetime object if passed date is valid, otherwise None
    """
    if date_str and date_str != "None":
        date_pieces = date_str.split(" ")  # e.g. 2016/02/02 20:28:06 US/Eastern
        date_pieces[0] = date_pieces[0].replace("/", "-")
        # Discard milliseconds if exists
        date_pieces[1] = (
            date_pieces[1][:-4] if "." in date_pieces[1] else date_pieces[1]
        )
        tz = date_pieces.pop(2)
        timezone = pytz.timezone(tz) if "GMT" not in tz else pytz.timezone("Etc/" + tz)
        tz_stripped_date = datetime.strptime(" ".join(date_pieces), "%Y-%m-%d %H:%M:%S")
        tz_aware_date = timezone.localize(tz_stripped_date)
        tz_aware_date = tz_aware_date.astimezone(pytz.utc)
        return tz_aware_date
    return None


def generate_course_prefix_list(bucket):
    """
    Assembles a list of OCW course prefixes from an S3 Bucket that contains all the raw jsons files

    Args:
        bucket (s3.Bucket): Instantiated S3 Bucket object
    Returns:
        List of course prefixes
    """
    ocw_courses = set()
    log.info("Assembling list of courses...")
    for bucket_file in bucket.objects.all():
        key_pieces = bucket_file.key.split("/")
        course_prefix = (
            "/".join(key_pieces[0:2]) if key_pieces[0] == "PROD" else key_pieces[0]
        )
        # retrieve courses, skipping non-courses (bootcamps, department topics, etc)
        if course_prefix not in NON_COURSE_DIRECTORIES:
            if "/".join(key_pieces[:-2]) != "":
                ocw_courses.add("/".join(key_pieces[:-2]) + "/")
    return list(ocw_courses)


def get_course_availability(course):
    """
    Gets the attribute `availability` for a course if any

    Args:
        course (Course): Course model instance

    Returns:
        str: The url for the course if any
    """
    if course.platform == PlatformType.ocw.value:
        return AvailabilityType.current.value
    elif course.platform == PlatformType.mitx.value:
        course_json = course.raw_json
        if course_json is None:
            return
        runs = course_json.get("course_runs")
        if runs is None:
            return
        # get appropriate course_run
        for run in runs:
            if run.get("key") == course.course_id:
                return run.get("availability")


def parse_bootcamp_json_data(bootcamp_data, force_overwrite=False):
    """
    Main function to parse bootcamp json data for one bootcamp

    Args:
        bootcamp_data (dict): The JSON object representing the bootcamp
        force_overwrite (bool): A boolean value to force the incoming bootcamp data to overwrite existing data
    """
    # Get the last modified date from the bootcamp
    bootcamp_modified = bootcamp_data.get("last_modified")

    # Try and get the bootcamp instance. If it exists check to see if it needs updating
    try:
        bootcamp_instance = Bootcamp.objects.get(
            course_id=bootcamp_data.get("course_id")
        )
        compare_datetime = datetime.strptime(
            bootcamp_modified, "%Y-%m-%dT%H:%M:%S.%fZ"
        ).astimezone(pytz.utc)
        if compare_datetime <= bootcamp_instance.last_modified and not force_overwrite:
            log.debug(
                "(%s, %s) skipped",
                bootcamp_data.get("key"),
                bootcamp_data.get("course_id"),
            )
            return
        index_func = update_bootcamp
    except Bootcamp.DoesNotExist:
        bootcamp_instance = None
        index_func = index_new_bootcamp

    # Overwrite platform with our own enum value
    bootcamp_data["platform"] = PlatformType.bootcamps.value
    bootcamp_serializer = BootcampSerializer(
        data=bootcamp_data, instance=bootcamp_instance
    )
    if not bootcamp_serializer.is_valid():
        log.error(
            "Bootcamp %s is not valid: %s",
            bootcamp_data.get("course_id"),
            bootcamp_serializer.errors,
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        bootcamp = bootcamp_serializer.save()
        load_offered_bys(bootcamp, [{"name": OfferedBy.bootcamps.value}])

        # Try and get the LearningResourceRun instance.
        try:
            run_instance = bootcamp.runs.get(run_id=bootcamp.course_id)
        except LearningResourceRun.DoesNotExist:
            run_instance = None
        run_serializer = LearningResourceRunSerializer(
            data={
                **bootcamp_data,
                "key": bootcamp_data.get("course_id"),
                "staff": bootcamp_data.get("instructors"),
                "seats": bootcamp_data.get("prices"),
                "start": bootcamp_data.get("start_date"),
                "end": bootcamp_data.get("end_date"),
                "run_id": bootcamp.course_id,
                "max_modified": bootcamp_modified,
                "content_type": ContentType.objects.get(model="bootcamp").id,
                "object_id": bootcamp.id,
                "url": bootcamp.url,
            },
            instance=run_instance,
        )
        if not run_serializer.is_valid():
            log.error(
                "Bootcamp LearningResourceRun %s is not valid: %s",
                bootcamp_data.get("key"),
                run_serializer.errors,
            )
            return
        run = run_serializer.save()

        load_offered_bys(run, [{"name": OfferedBy.bootcamps.value}])

    index_func(bootcamp.id)


# pylint: disable=too-many-locals
def sync_ocw_course(
    *, course_prefix, raw_data_bucket, force_overwrite, upload_to_s3, blacklist
):
    """
    Sync an OCW course run

    Args:
        course_prefix (str): The course prefix
        raw_data_bucket (boto3.resource): The S3 bucket containing the OCW information
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        upload_to_s3 (bool): If True, upload course media to S3
        blacklist (list of str): list of course ids that should not be published

    Returns:
        str:
            The UID, or None if the run_id is not found, or if it was found but not synced
    """
    loaded_raw_jsons_for_course = []
    last_modified_dates = []
    uid = None
    is_published = True
    log.info("Syncing: %s ...", course_prefix)
    # Collect last modified timestamps for all course files of the course
    for obj in raw_data_bucket.objects.filter(Prefix=course_prefix):
        # the "1.json" metadata file contains a course's uid
        if obj.key == course_prefix + "0/1.json":
            try:
                first_json = safe_load_json(get_s3_object_and_read(obj), obj.key)
                uid = first_json.get("_uid")
                last_published_to_production = format_date(
                    first_json.get("last_published_to_production", None)
                )
                last_unpublishing_date = format_date(
                    first_json.get("last_unpublishing_date", None)
                )
                if last_published_to_production is None or (
                    last_unpublishing_date
                    and (last_unpublishing_date > last_published_to_production)
                ):
                    is_published = False
            except:  # pylint: disable=bare-except
                log.exception("Error encountered reading 1.json for %s", course_prefix)
        # accessing last_modified from s3 object summary is fast (does not download file contents)
        last_modified_dates.append(obj.last_modified)
    if not uid:
        # skip if we're unable to fetch course's uid
        log.info("Skipping %s, no course_id", course_prefix)
        return None
    # get the latest modified timestamp of any file in the course
    last_modified = max(last_modified_dates)

    # fetch JSON contents for each course file in memory (slow)
    log.info("Loading JSON for %s...", course_prefix)
    for obj in sorted(
        raw_data_bucket.objects.filter(Prefix=course_prefix),
        key=lambda x: int(x.key.split("/")[-1].split(".")[0]),
    ):
        loaded_raw_jsons_for_course.append(
            safe_load_json(get_s3_object_and_read(obj), obj.key)
        )

    log.info("Parsing for %s...", course_prefix)
    # pass course contents into parser
    parser = OCWParser("", "", loaded_raw_jsons_for_course)
    course_json = parser.get_master_json()
    course_json["uid"] = uid
    course_json["course_id"] = "{}.{}".format(
        course_json.get("department_number"), course_json.get("master_course_number")
    )
    if course_json["course_id"] in blacklist:
        is_published = False

    # if course run synced before, update existing Course instance
    courserun_instance = LearningResourceRun.objects.filter(
        platform=PlatformType.ocw.value, run_id=uid
    ).first()

    # Make sure that the data we are syncing is newer than what we already have
    if (
        courserun_instance
        and last_modified <= courserun_instance.last_modified
        and not force_overwrite
    ):
        log.info("Already synced. No changes found for %s", course_prefix)
        return None

    if upload_to_s3 and is_published:
        # Upload all course media to S3 before serializing course to ensure the existence of links
        parser.setup_s3_uploading(
            settings.OCW_LEARNING_COURSE_BUCKET_NAME,
            settings.OCW_LEARNING_COURSE_ACCESS_KEY,
            settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
            # course_prefix now has trailing slash so [-2] below is the last
            # actual element and [-1] is an empty string
            course_prefix.split("/")[-2],
        )
        if settings.OCW_UPLOAD_IMAGE_ONLY:
            parser.upload_course_image()
        else:
            parser.upload_all_media_to_s3(upload_master_json=True)

    log.info("Digesting %s...", course_prefix)
    digest_ocw_course(course_json, last_modified, is_published, course_prefix)
    return uid


def sync_ocw_courses(*, force_overwrite, upload_to_s3):
    """
    Sync OCW courses to the database

    Args:
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        upload_to_s3 (bool): If True, upload course media to S3

    Returns:
        set[str]: All LearningResourceRun.run_id values for course runs which were synced
    """
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_CONTENT_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_CONTENT_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)

    # get all the courses prefixes we care about
    ocw_courses = generate_course_prefix_list(raw_data_bucket)

    # get a list of blacklisted course ids
    blacklist = load_course_blacklist()

    # loop over each course
    uids = set()
    for course_prefix in sorted(ocw_courses):
        try:
            uid = sync_ocw_course(
                course_prefix=course_prefix,
                raw_data_bucket=raw_data_bucket,
                force_overwrite=force_overwrite,
                upload_to_s3=upload_to_s3,
                blacklist=blacklist,
            )

            if uid:
                uids.add(uid)
        except:  # pylint: disable=bare-except
            log.exception("Error encountered parsing OCW json for %s", course_prefix)
    return uids


def update_course_published(runs):
    """
    Fix the is_published value for each course

    Args:
        runs (iterable of LearningResourceRun): An iterable of LearningResourceRun

    Returns:
        set[int]: A set of Course ids
    """
    log.info("Fixing is_published values for each course...")
    done_courses = set()
    for run in runs:
        course = run.content_object
        if course.id not in done_courses:
            runs_published = course.runs.values_list("published", flat=True)
            course.published = any(runs_published)
            course.save()
            done_courses.add(course.id)
    return done_courses


def sync_ocw_data(*, force_overwrite, upload_to_s3):
    """
    Sync OCW data to database

    Args:
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
        upload_to_s3 (bool): If True, upload course media to S3
    """
    uids = sync_ocw_courses(force_overwrite=force_overwrite, upload_to_s3=upload_to_s3)
    course_ids = update_course_published(
        LearningResourceRun.objects.filter(run_id__in=uids)
    )
    for course in Course.objects.filter(id__in=course_ids):
        # Probably quicker to do this as a bulk operation
        if course.published:
            upsert_course(course.id)
        else:
            delete_course(course)


def sync_ocw_files(ids=None):
    """
    Sync all OCW course run files for a list of course ids to database

    Args:
        ids(list of int or None): list of course ids to process, all if None
    """
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_LEARNING_COURSE_BUCKET_NAME)

    courses = Course.objects.filter(platform="ocw").filter(runs__files__isnull=True)
    if ids is not None:
        courses = courses.filter(id__in=ids)
    for course in courses.iterator():
        runs = course.runs.exclude(url="")
        for run in runs.iterator():
            prefix = run.url.split("/")[-1]
            for course_file in raw_data_bucket.objects.filter(Prefix=prefix):
                try:
                    data = (
                        raw_data_bucket.Object(course_file.key)
                            .get()
                            .get("Body", None)
                    )
                    sync_course_run_file(run, course_file.key, data)
                except:  # pylint: disable=bare-except
                    log.error("ERROR syncing %s", course_file.key)


def sync_course_run_file(course_run, course_file_name, data):
    """
    Sync an OCW course run file to the database

    Args:
        course_run (LearningResourceRun): a LearningResourceRun for a Course
        course_file_name (str): The name of the file
        data (bytes or str): The content of the file

    Returns:
        CourseRunFile: the object that was created or updated
    """
    extension = course_file_name.split(".")[-1].lower()
    if extension in ["pdf", "htm", "html", "txt"]:
        if extension == "pdf":
            pdf = pdftotext.PDF(data)
            fulltext = "\n\n".join(pdf)
        else:
            fulltext = data
        course_run_file, _ = CourseRunFile.objects.update_or_create(
            run=course_run,
            key=course_file_name,
            defaults={"full_content": fulltext},
        )
        upsert_course_run_file(course_run_file.id)
        return course_run_file
