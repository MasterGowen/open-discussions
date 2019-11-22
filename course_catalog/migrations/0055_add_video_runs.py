# Generated by Django 2.1.11 on 2019-11-22 15:10

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0054_add_playlist_userlist")]

    operations = [
        migrations.AlterField(
            model_name="learningresourcerun",
            name="content_type",
            field=models.ForeignKey(
                limit_choices_to={
                    "model__in": ("course", "bootcamp", "program", "video")
                },
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="contenttypes.ContentType",
            ),
        )
    ]
