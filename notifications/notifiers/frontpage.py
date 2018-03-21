"""Notifier for frontpage digest"""
from datetime import datetime

from django.conf import settings
import pytz

from channels import api, serializers
from channels.utils import ListingParams
from notifications.models import (
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications.notifiers.email import EmailNotifier
from notifications.notifiers.exceptions import (
    InvalidTriggerFrequencyError,
    CancelNotificationError,
)
from open_discussions import features

DAILY_LISTING_PARAMS = ListingParams(None, None, 0, api.POSTS_SORT_HOT)
WEEKLY_LISTING_PARAMS = ListingParams(None, None, 0, api.POSTS_SORT_TOP)


def _get_listing_params(trigger_frequency):
    """
    Returns the listing params for the given trigger_frequency

    Args:
        trigger_frequency (str): trigger frequency to query for

    Raises:
        InvalidTriggerFrequencyError: if the frequency is invalid for the frontpage digest

    Returns:
        ListingParams: the listing params configured for this trigger_frequency
    """
    if trigger_frequency == FREQUENCY_DAILY:
        return DAILY_LISTING_PARAMS
    elif trigger_frequency == FREQUENCY_WEEKLY:
        return WEEKLY_LISTING_PARAMS
    else:
        raise InvalidTriggerFrequencyError(
            "Trigger frequency '{}' is invalid for frontpage".format(trigger_frequency)
        )


def _is_post_after_notification(post, notification):
    """
    Returns True if the post was created after the specified notification

    Args:
        notification_settings (NotificationSettings): settings for this user and notification_type
        notification (NotificationBase): notification that was triggered for this NotificationSettings

    Returns:
        bool: True if the post was created after the specified notification
    """
    if notification is None:
        return True
    return datetime.fromtimestamp(post.created, tz=pytz.utc) > notification.created_on


def _posts_since_notification(notification_settings, notification):
    """
    Returns posts that were created after the given notification

    Args:
        notification_settings (NotificationSettings): settings for this user and notification_type
        notification (NotificationBase): notification that was triggered for this NotificationSettings

    Raises:
        InvalidTriggerFrequencyError: if the frequency is invalid

    Returns:
        list of praw.models.Submission: list of posts
    """
    user = notification_settings.user
    params = _get_listing_params(notification_settings.trigger_frequency)
    api_client = api.Api(user)

    posts = api_client.front_page(params)

    # filter posts
    posts = [
        post
        for post in posts
        if not post.stickied and _is_post_after_notification(post, notification)
    ]

    posts = posts[:settings.OPEN_DISCUSSIONS_FRONTPAGE_DIGEST_MAX_POSTS]

    return posts


class FrontpageDigestNotifier(EmailNotifier):
    """Notifier for frontpage digests"""
    def __init__(self):
        super().__init__('frontpage')

    def can_notify(self, notification_settings, last_notification):
        """
        Returns true if we can notify this user based on their settings and when the last notification occurred

        Args:
            notification_settings (NotificationSettings): settings for this user and notification_type
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid

        Returns:
            bool: True if we're due to send another notification
        """
        return (
            features.is_enabled(features.FRONTPAGE_EMAIL_DIGESTS) and
            super().can_notify(notification_settings, last_notification) and
            # do this last as it's expensive if the others are False anyway
            # check if we have posts since the last notification
            bool(_posts_since_notification(notification_settings, last_notification))
        )

    def _get_notification_data(self, notification_settings, last_notification):
        """
        Gets the data for this notification

        Args:
            notification_settings (NotificationSettings): settings for this user and notification_type
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid for the frontpage digest
        """
        posts = _posts_since_notification(notification_settings, last_notification)

        if not posts:
            # edge case, nothing new to send even though we expected some
            raise CancelNotificationError()

        return {
            'posts': [
                serializers.PostSerializer(
                    post,
                    context={
                        'current_user': notification_settings.user,
                    },
                ).data
                for post in posts
            ],
        }