# Generated by Django 2.1.5 on 2019-03-04 23:22

from django.db import migrations, models

from course_catalog.task_helpers import get_course_availability


def populate_availability(apps, schema_editor):
    """
    Back-fills availability values for Courses
    """
    Course = apps.get_model("course_catalog", "Course")
    for course in Course.objects.iterator():
        course.availability = get_course_availability(course)
        course.save(update_fields=["availability"])


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0019_course_url")]

    operations = [
        migrations.AddField(
            model_name="course",
            name="availability",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.RunPython(
            populate_availability, reverse_code=migrations.RunPython.noop
        ),
    ]