# Generated by Django 2.1.2 on 2018-11-14 22:32

from django.conf import settings
import django.contrib.postgres.fields.jsonb
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("channels", "0011_channel_subscriptions_roles"),
    ]

    operations = [
        migrations.CreateModel(
            name="Article",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_on", models.DateTimeField(auto_now_add=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                ("content", django.contrib.postgres.fields.jsonb.JSONField()),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"abstract": False},
        ),
        migrations.AddField(
            model_name="post",
            name="post_type",
            field=models.CharField(
                choices=[("link", "link"), ("self", "self"), ("article", "article")],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="article",
            name="post",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE, to="channels.Post"
            ),
        ),
    ]