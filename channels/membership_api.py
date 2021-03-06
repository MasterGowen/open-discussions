"""API for managing channel memberships"""
import logging
import operator
from functools import reduce

from django.contrib.auth import get_user_model

from channels.api import get_admin_api
from channels.models import Channel
from profiles.filters import UserFilter
from profiles.models import Profile

log = logging.getLogger()
User = get_user_model()


def update_memberships_for_managed_channels(*, channel_ids=None, user_ids=None):
    """
    Update channels that are managed and have channel memberhip configs

    Args:
        channel_ids (list of int):
            optional list of channel ids to generate memberships for
        user_ids (list of int):
            optional list of user ids to filter to
    """
    # channels with a membership config
    channels = Channel.objects.filter(
        membership_is_managed=True, channel_membership_configs__isnull=False
    )

    if channel_ids:
        channels = channels.filter(id__in=channel_ids)
    for channel in channels:
        update_memberships_for_managed_channel(channel, user_ids=user_ids)


def update_memberships_for_managed_channel(channel, *, user_ids=None):
    """
    Update the channel memberships for a given channel.
    If the channel is not managed, nothing happens.

    Args:
        channel (Channel):
            the channel to generate memberships for
        user_ids (list of int):
            optional list of user ids to filter to
    """
    if (
        not channel.membership_is_managed
        or not channel.channel_membership_configs.exists()
    ):
        log.debug(
            "update_managed_channel_membership() called for a channel"
            "that is not managed and/or has no channel membership configs: %s",
            channel.name,
        )
        return

    admin_api = get_admin_api()
    active_users = User.objects.filter(is_active=True)

    # create a list of user queries as generated by UserFilter
    filtered_user_queries = [
        UserFilter(config.query, queryset=active_users).qs
        for config in channel.channel_membership_configs.all()
    ]
    # bitwise OR the queries together so that users that match ANY of them are added to the channel
    users_in_channel = reduce(
        operator.or_,
        filtered_user_queries,
        # specify an initial empty query in case we hit a race condition and
        # `filtered_user_queries` ended up empty, otherwise `reduce()` would fail
        User.objects.none(),
    )

    # ensure that we're not about to select all users, because this is almost definitely not what we want
    # this can happen if the query configs didn't match ANY filter options
    # this is a bit of a hack to protect this, but it's sufficient for now
    if str(users_in_channel.query) == str(active_users.query):
        log.error(
            "Membership query configs for channel '%s' result in all active users being added, this is likely not desired",
            channel.name,
        )
        return

    # filter here, rather than earlier
    # this ensure the check above works in all cases
    if user_ids:
        users_in_channel = users_in_channel.filter(id__in=user_ids)

    for user in users_in_channel.only("username").distinct():
        try:
            admin_api.add_contributor(user.username, channel.name)
            admin_api.add_subscriber(user.username, channel.name)
        except Profile.DoesNotExist:
            log.exception(
                "Channel %s membership update failed due to missing user profile: %s",
                channel.name,
                user.username,
            )
