# Generated by Django 2.1.15 on 2020-01-23 16:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0062_expanded_coursefile")]

    operations = [
        migrations.RenameField(
            model_name="courserunfile", old_name="type", new_name="file_type"
        ),
        migrations.RemoveField(model_name="courserunfile", name="section"),
        migrations.AlterField(
            model_name="courserunfile",
            name="content_type",
            field=models.CharField(
                choices=[("page", "page"), ("file", "file")],
                default="file",
                max_length=10,
            ),
        ),
    ]
