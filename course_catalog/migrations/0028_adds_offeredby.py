# Generated by Django 2.1.7 on 2019-06-24 20:35

from django.db import migrations, models

from course_catalog.constants import OfferedBy, PlatformType


def backfill_offeredby(apps, schema_editor):
    """
    Backfills offered_by values for existing Courses and Bootcamps
    """
    Course = apps.get_model("course_catalog", "Course")
    for course in Course.objects.iterator():
        if course.program_type == "Professional":
            course.offered_by = OfferedBy.xpro.value
        elif course.program_type == "MicroMasters":
            course.offered_by = OfferedBy.micromasters.value
        elif course.platform == PlatformType.ocw.value:
            course.offered_by = OfferedBy.ocw.value
        elif course.platform == PlatformType.mitx.value:
            course.offered_by = OfferedBy.mitx.value
        elif course.platform == PlatformType.bootcamps.value:
            course.offered_by = OfferedBy.bootcamps.value
        else:
            continue
        course.save(update_fields=["offered_by"])

    Bootcamp = apps.get_model("course_catalog", "Bootcamp")
    for bootcamp in Bootcamp.objects.iterator():
        bootcamp.offered_by = OfferedBy.bootcamps.value
        bootcamp.save(update_fields=["offered_by"])


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0027_adds_unique_together_constraint")]

    operations = [
        migrations.AddField(
            model_name="bootcamp",
            name="offered_by",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name="course",
            name="offered_by",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name="program",
            name="offered_by",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name="userlist",
            name="offered_by",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.RunPython(
            backfill_offeredby, reverse_code=migrations.RunPython.noop
        ),
    ]