"""Tests for task helper functions for channels"""


from channels.task_helpers import (
    sync_channel_model,
    sync_comment_model,
    sync_post_model,
)


def test_sync_channel_model(mocker):
    """sync_channel_model should sync the PRAW channel object into our database"""
    channel_name = 'a_channel'
    channel = mocker.Mock(
        display_name=channel_name,
    )
    patched = mocker.patch('channels.tasks.sync_channel_model', autospec=True)
    sync_channel_model(channel)
    patched.delay.assert_called_once_with(channel_name)


def test_sync_comment_model(mocker):
    """sync_comment_model should sync the PRAW comment object into our database"""
    channel_name = 'a_channel'
    post_id = '123'
    comment_id = '456'
    parent_id = '789'
    comment = mocker.Mock(
        id=comment_id,
        subreddit=mocker.Mock(display_name=channel_name),
        submission=mocker.Mock(id=post_id),
    )
    comment.parent = mocker.Mock(return_value=mocker.Mock(id=parent_id))
    patched = mocker.patch('channels.tasks.sync_comment_model', autospec=True)
    sync_comment_model(comment)
    patched.delay.assert_called_once_with(
        channel_name=channel_name,
        post_id=post_id,
        comment_id=comment_id,
        parent_id=parent_id,
    )


def test_sync_post_model(mocker):
    """sync_post_model should sync the PRAW post objects"""
    channel_name = 'a_channel'
    post_id = '456'
    post = mocker.Mock(
        id=post_id,
        subreddit=mocker.Mock(display_name=channel_name),
    )
    patched = mocker.patch('channels.tasks.sync_post_model', autospec=True)
    sync_post_model(post)
    patched.delay.assert_called_once_with(
        channel_name=channel_name,
        post_id=post_id,
    )