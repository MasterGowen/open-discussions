# Generated by Django 2.1.15 on 2020-01-15 20:16

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0060_learningresourcefile")]

    operations = [migrations.RenameModel("LearningResourceFile", "CourseRunFile")]
