# Generated by Django 2.2.10 on 2020-03-12 17:38

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [("channels", "0023_add_subscriptions_related_name")]

    operations = [
        migrations.CreateModel(
            name="MoiraList",
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
                ("name", models.CharField(max_length=250, unique=True)),
            ],
            options={"abstract": False},
        ),
        migrations.CreateModel(
            name="ChannelMoiraList",
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
                (
                    "channel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="moira_lists",
                        to="channels.Channel",
                    ),
                ),
                (
                    "moira_list",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="channels",
                        to="channels.MoiraList",
                    ),
                ),
            ],
            options={"abstract": False},
        ),
    ]
