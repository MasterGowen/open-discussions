"""OCW course catalog ETL"""
import logging
from urllib.parse import urlparse

import boto3
import rapidjson
from django.conf import settings

from course_catalog.constants import (
    CONTENT_TYPE_PAGE,
    CONTENT_TYPE_FILE,
    VALID_TEXT_FILE_TYPES,
)
from course_catalog.etl.utils import extract_text_metadata, sync_s3_text
from course_catalog.models import ContentFile
from open_discussions.utils import extract_values

log = logging.getLogger()


def get_ocw_learning_course_bucket():
    """
    Get the OCW S3 Bucket or None

    Returns:
        boto3.Bucket: the OCW S3 Bucket or None
    """
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
    )
    return s3.Bucket(name=settings.OCW_LEARNING_COURSE_BUCKET_NAME)


def transform_content_files(course_run_json):
    """
    Transforms relevant sections of course_run master_json into course content_file data

    Args:
        course_run_json (dict): The course run master JSON

    Returns:
        list of dict: List of transformed content file data

    """
    json_course_files = course_run_json.get("course_files", [])
    json_course_pages = course_run_json.get("course_pages", [])
    json_course_files.extend(course_run_json.get("course_foreign_files", []))

    content_files = []
    for course_file in json_course_files:
        try:
            content_files.append(
                transform_content_file(course_run_json, course_file, CONTENT_TYPE_FILE)
            )
        except:  # pylint: disable=bare-except
            log.exception(
                "ERROR syncing course file %s for run %d",
                course_file.get("uid", ""),
                course_run_json.get("uid", ""),
            )
    for course_page in json_course_pages:
        try:
            content_files.append(
                transform_content_file(course_run_json, course_page, CONTENT_TYPE_PAGE)
            )
        except:  # pylint: disable=bare-except
            log.exception(
                "ERROR syncing course page %s for run %d",
                course_page.get("uid", ""),
                course_run_json.get("uid", ""),
            )
    return content_files


def transform_content_file(course_run_json, content_file, content_type):
    """
    Transforms content json based on master_json

    Args:
        course_run_json (dict): course run master_json
        content_file (dict): the content_file json
        content_type (str): file or page

    Returns:
        dict: transformed content_file json
    """
    try:
        bucket = get_ocw_learning_course_bucket()
        content_json = {}
        json_course_pages = course_run_json.get("course_pages", [])

        content_file["content_type"] = content_type
        s3_url = content_file.get("file_location", None)
        if not s3_url:
            # Nothing to do without an S3 key
            # HTML files will be skipped until latest ocw-data-parser is used
            return None

        key = urlparse(s3_url).path[1:]
        extension = key.split(".")[-1].lower()
        content_file["key"] = key
        content_file["file_type"] = content_file.get(
            "file_type", content_file.get("type", None)
        )
        content_file["url"] = get_content_file_url(
            content_file,
            [
                media
                for sublist in extract_values(course_run_json, "embedded_media")
                for media in sublist
            ],
            content_type,
        )

        s3_obj = bucket.Object(key).get()
        course_file_obj = ContentFile.objects.filter(key=key).first()
        needs_text_update = course_file_obj is None or (
            s3_obj is not None and s3_obj["LastModified"] >= course_file_obj.updated_on
        )
        if needs_text_update and extension in VALID_TEXT_FILE_TYPES:
            s3_body = s3_obj.get("Body") if s3_obj else None
            if s3_body:
                content_json = extract_text_metadata(s3_body)
                sync_s3_text(bucket, key, content_json)

        content_file["section"] = get_content_file_section(
            content_file, json_course_pages
        )
        if content_json:
            content_json_meta = content_json.get("metadata", {})
            content_file["content"] = content_json.get("content", None)
            content_file["content_author"] = content_json_meta.get("Author", None)
            content_file["content_language"] = content_json_meta.get("language", None)
            content_file["content_title"] = content_json_meta.get("title", None)

        for field in list(
            set(content_file.keys())
            - {field.name for field in ContentFile._meta.get_fields()}
        ):
            content_file.pop(field)

        return content_file
    except:  # pylint:disable=bare-except
        log.exception(
            "Error transforming %s for course run %s",
            rapidjson.dumps(content_file),
            s3_url,
        )


def get_content_file_url(content_file, media_section, content_type):
    """
    Calculate the best URL for a content file

    Args:
    content_file (dict): the content file JSON
    media_section (list of dict): list of media definitions
    content_type (str): file or page

    Returns:
        str: url
    """
    if content_type == CONTENT_TYPE_PAGE:
        return f"https://ocw.mit.edu{content_file.get('url', '')}"
    elif content_file.get("uid", None) is not None:
        # Media info, if it exists, contains external URL details for a file
        media_info = [
            media for media in media_section if media["uid"] == content_file["uid"]
        ]
        if media_info:
            return media_info[0].get(
                "technical_location", media_info[0].get("media_info", None)
            )
        else:
            # Fall back to the new S3 URL if nothing else can be found
            return f"https://s3.amazonaws.com/{settings.OCW_LEARNING_COURSE_BUCKET_NAME}/{content_file.get('key')}"
    elif content_file.get("link", None) is not None:
        return content_file.get("link", content_file.get("file_location", None))
    return None


def get_content_file_section(content_file, pages_section):
    """
    Get the section the content belongs to

    Args:
    content_file (dict): the content file JSON
    pages_section (list of dict): list of pages

    Returns:
        str: page section
    """
    if content_file.get("parent_uid") is not None:
        page_info = [
            page for page in pages_section if page["uid"] == content_file["parent_uid"]
        ]
        if page_info:
            return page_info[0]["title"]
        elif content_file.get("content_type") == CONTENT_TYPE_PAGE:
            return content_file.get("title", None)
    return None


def upload_mitx_course_manifest(courses):
    """
    Uploads the course information from MITx to the OCW bucket as a JSON manifest file

    Args:
        courses (list of dict): the list of course data as they came from MITx

    Returns:
        bool: success of upload
    """
    if not all(
        [
            settings.OCW_LEARNING_COURSE_ACCESS_KEY,
            settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
            settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        ]
    ):
        log.info("OCW S3 environment variable not set, skipping upload to OCW bucket")
        return False

    if not courses:
        log.info("No edX courses, skipping upload to OCW bucket")
        return False

    log.info("Uploading edX courses data to S3")

    manifest = {"results": courses, "count": len(courses)}

    ocw_bucket = get_ocw_learning_course_bucket()
    ocw_bucket.put_object(Key="edx_courses.json", Body=rapidjson.dumps(manifest))
    return True
