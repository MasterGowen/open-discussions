# Generated by Django 2.1.5 on 2019-01-18 19:04

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("channels", "0017_remove_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="comment",
            name="author",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="comment", name="deleted", field=models.BooleanField(null=True)
        ),
        migrations.AddField(
            model_name="comment", name="edited", field=models.BooleanField(null=True)
        ),
        migrations.AddField(
            model_name="comment", name="removed", field=models.BooleanField(null=True)
        ),
        migrations.AddField(
            model_name="comment", name="score", field=models.BigIntegerField(null=True)
        ),
        migrations.AddField(
            model_name="comment", name="text", field=models.TextField(null=True)
        ),
        migrations.AddField(
            model_name="post",
            name="author",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="post", name="deleted", field=models.BooleanField(null=True)
        ),
        migrations.AddField(
            model_name="post", name="edited", field=models.BooleanField(null=True)
        ),
        migrations.AddField(
            model_name="post",
            name="num_comments",
            field=models.BigIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="post", name="removed", field=models.BooleanField(null=True)
        ),
        migrations.AddField(
            model_name="post", name="score", field=models.BigIntegerField(null=True)
        ),
        migrations.AddField(
            model_name="post", name="text", field=models.TextField(null=True)
        ),
        migrations.AddField(
            model_name="post",
            name="title",
            field=models.CharField(max_length=300, null=True),
        ),
        migrations.AddField(
            model_name="post",
            name="url",
            field=models.URLField(max_length=2048, null=True),
        ),
    ]
