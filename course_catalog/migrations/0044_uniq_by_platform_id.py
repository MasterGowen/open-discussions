# Generated by Django 2.1.11 on 2019-10-07 19:34

from django.db import migrations, models

from course_catalog.constants import OFFERED_BY_MAPPINGS


def populate_platforms(apps, schema_editor):
    """Populate all platform fields"""
    Course = apps.get_model("course_catalog", "Course")
    LearningResourceRun = apps.get_model("course_catalog", "LearningResourceRun")

    for course in Course.objects.iterator():
        course.platform = OFFERED_BY_MAPPINGS.get(course.offered_by, course.platform)
        course.save()

    for run in LearningResourceRun.objects.iterator():
        run.platform = OFFERED_BY_MAPPINGS.get(run.offered_by, run.platform)
        run.save()


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0043_runs_for_programs")]

    operations = [
        migrations.AddField(
            model_name="learningresourcerun",
            name="platform",
            field=models.CharField(max_length=128, null=True),
        ),
        migrations.AlterField(
            model_name="course",
            name="course_id",
            field=models.CharField(max_length=128),
        ),
        migrations.AlterField(
            model_name="learningresourcerun",
            name="run_id",
            field=models.CharField(max_length=128),
        ),
        migrations.RunPython(
            populate_platforms, reverse_code=migrations.RunPython.noop
        ),
    ]