"""Management command for populating ocw course run file data"""
import celery
from django.conf import settings
from django.core.management import BaseCommand

from course_catalog.constants import PlatformType
from course_catalog.models import Course
from course_catalog.tasks import get_ocw_files
from course_catalog.utils import load_course_blacklist
from open_discussions.utils import now_in_utc, chunks


class Command(BaseCommand):
    """Populate ocw course run files"""

    help = "Populate ocw course run files"

    def handle(self, *args, **options):
        """Run Populate ocw course run files"""
        blacklisted_ids = load_course_blacklist()
        task = celery.group(
            [
                get_ocw_files.si(ids)
                for ids in chunks(
                Course.objects.filter(published=True)
                    .filter(platform=PlatformType.ocw.value)
                    .exclude(course_id__in=blacklisted_ids)
                    .order_by("id")
                    .values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE
            )
            ]
        )()
        self.stdout.write(
            "Started task {task} to get ocw course run file data".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of ocw file data finished, took {} seconds".format(total_seconds)
        )
