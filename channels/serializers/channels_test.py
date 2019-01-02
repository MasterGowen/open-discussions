"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import Mock

import pytest
from channels.api import get_allowed_post_types_from_link_type
from channels.constants import LINK_TYPE_LINK, LINK_TYPE_SELF, LINK_TYPE_ANY
from channels.models import Channel
from channels.serializers.channels import ChannelSerializer


pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("has_avatar", [True, False])
@pytest.mark.parametrize("has_banner", [True, False])
@pytest.mark.parametrize("ga_tracking_id", [None, "abc123"])
@pytest.mark.parametrize("membership_is_managed", [True, False])
@pytest.mark.parametrize("allowed_post_types", [{}, {"self": True, "link": False}])
@pytest.mark.parametrize("link_type", [LINK_TYPE_ANY, LINK_TYPE_LINK, LINK_TYPE_SELF])
def test_serialize_channel(
    user,
    has_avatar,
    has_banner,
    ga_tracking_id,
    membership_is_managed,
    allowed_post_types,
    link_type,
):  # pylint: disable=too-many-arguments
    """
    Test serializing a channel
    """
    channel = Mock(
        display_name="name",
        title="title",
        subreddit_type="public",
        description="description",
        public_description="public_description",
        submission_type=link_type,
        membership_is_managed=membership_is_managed,
        allowed_post_types=allowed_post_types,
        banner=Mock() if has_banner else None,
        avatar=Mock() if has_avatar else None,
        avatar_small=Mock() if has_avatar else None,
        avatar_medium=Mock() if has_avatar else None,
        ga_tracking_id=ga_tracking_id,
        widget_list_id=123,
    )

    request = Mock(user=user)

    assert ChannelSerializer(channel, context={"request": request}).data == {
        "name": "name",
        "title": "title",
        "channel_type": "public",
        "link_type": link_type,
        "description": "description",
        "public_description": "public_description",
        "user_is_moderator": True,
        "user_is_contributor": True,
        "membership_is_managed": membership_is_managed,
        "avatar": channel.avatar.url if has_avatar else None,
        "avatar_small": channel.avatar_small.url if has_avatar else None,
        "avatar_medium": channel.avatar_medium.url if has_avatar else None,
        "banner": channel.banner.url if has_banner else None,
        "ga_tracking_id": channel.ga_tracking_id,
        "allowed_post_types": [
            key for key, enabled in allowed_post_types.items() if enabled
        ]
        if allowed_post_types
        else get_allowed_post_types_from_link_type(link_type),
        "widget_list_id": channel.widget_list_id,
    }


@pytest.mark.parametrize("membership_is_managed", [True, False, None])
def test_create_channel(staff_user, user, membership_is_managed, mocker, settings):
    """
    Test creating a channel
    """
    settings.INDEXING_API_USERNAME = staff_user.username
    api_mock = mocker.patch("channels.api.Api")
    context_api_mock = api_mock(user)
    indexer_api_mock = api_mock(staff_user)
    validated_data = {
        "display_name": "name",
        "title": "title",
        "subreddit_type": "public",
        "submission_type": "self",
        "description": "description",
        "public_description": "public_description",
    }
    if membership_is_managed is not None:
        validated_data["membership_is_managed"] = membership_is_managed
    expected_membership = membership_is_managed is not False
    request = Mock(user=user)
    channel = ChannelSerializer(
        context={"channel_api": context_api_mock, "request": request}
    ).create(validated_data)

    indexer_api_mock.create_channel.assert_called_once_with(
        name=validated_data["display_name"],
        title=validated_data["title"],
        channel_type=validated_data["subreddit_type"],
        description=validated_data["description"],
        public_description=validated_data["public_description"],
        link_type=validated_data["submission_type"],
        membership_is_managed=expected_membership,
    )
    indexer_api_mock.add_moderator.assert_called_once_with(
        context_api_mock.user.username, channel.display_name
    )
    assert channel == indexer_api_mock.create_channel.return_value


@pytest.mark.parametrize(
    "validated_data, expected_kwawrgs",
    [
        [{}, {}],
        [
            {
                "title": "title",
                "subreddit_type": "public",
                "description": "description",
                "public_description": "public_description",
                "submission_type": "text",
            },
            {
                "title": "title",
                "channel_type": "public",
                "description": "description",
                "public_description": "public_description",
                "link_type": "text",
            },
        ],
        [
            {"allowed_post_types": ["self", "link", "article"]},
            {"allowed_post_types": ["self", "link", "article"]},
        ],
    ],
)
def test_update_channel(user, validated_data, expected_kwawrgs):
    """
    Test updating a channel
    """
    display_name = "subreddit"
    Channel.objects.create(name=display_name)
    instance = Mock(display_name=display_name)
    request = Mock(user=user)
    api_mock = Mock()
    channel = ChannelSerializer(
        context={"channel_api": api_mock, "request": request}
    ).update(instance, validated_data)
    api_mock.update_channel.assert_called_once_with(
        name=display_name, **expected_kwawrgs
    )
    assert channel == api_mock.update_channel.return_value