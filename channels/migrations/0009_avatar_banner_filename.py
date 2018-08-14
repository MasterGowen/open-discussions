# -*- coding: utf-8 -*-
# Generated by Django 1.11.10 on 2018-08-14 17:51
from __future__ import unicode_literals

from django.db import migrations, models
import profiles.utils


class Migration(migrations.Migration):

    dependencies = [
        ('channels', '0008_channel_ga_tracking_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='channel',
            name='avatar',
            field=models.ImageField(max_length=2083, null=True, upload_to=profiles.utils.avatar_uri),
        ),
        migrations.AlterField(
            model_name='channel',
            name='banner',
            field=models.ImageField(max_length=2083, null=True, upload_to=profiles.utils.banner_uri),
        ),
    ]