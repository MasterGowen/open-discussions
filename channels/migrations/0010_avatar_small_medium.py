# -*- coding: utf-8 -*-
# Generated by Django 1.11.10 on 2018-08-16 16:49
from __future__ import unicode_literals

from django.db import migrations, models
import profiles.utils


def nullify_avatars(apps, schema_editor):
    """
    Set all avatars to None. Since we don't show avatars yet
    this avoids the work of populating avatar_small and avatar_medium
    """
    Channel = apps.get_model('channels', 'Channel')
    # At the point the migration runs
    Channel.objects.all().update(avatar_medium=None, avatar_small=None, avatar=None)


class Migration(migrations.Migration):

    dependencies = [
        ('channels', '0009_avatar_banner_filename'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='avatar_medium',
            field=models.ImageField(max_length=2083, null=True, upload_to=profiles.utils.avatar_uri_medium),
        ),
        migrations.AddField(
            model_name='channel',
            name='avatar_small',
            field=models.ImageField(max_length=2083, null=True, upload_to=profiles.utils.avatar_uri_small),
        ),
        migrations.RunPython(nullify_avatars, reverse_code=migrations.RunPython.noop),
    ]