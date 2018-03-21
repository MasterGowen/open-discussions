# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2018-03-09 16:04
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_add_notifications'),
    ]

    operations = [
        migrations.AlterField(
            model_name='emailnotification',
            name='state',
            field=models.CharField(choices=[('pending', 'Pending'), ('sending', 'Sending'), ('sent', 'Sent'), ('canceled', 'Canceled')], default='pending', max_length=10),
        ),
    ]