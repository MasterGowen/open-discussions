"""Search API function tests"""
from types import SimpleNamespace
import pytest

from search.api import (
    get_reddit_object_type,
    is_reddit_object_removed,
    gen_post_id,
    gen_comment_id,
)
from channels.constants import (
    POST_TYPE,
    COMMENT_TYPE,
)


@pytest.mark.parametrize('reddit_obj,expected_type', [
    (SimpleNamespace(id=1), POST_TYPE),
    (SimpleNamespace(id=1, submission={}), COMMENT_TYPE),
])
def test_get_reddit_object_type(reddit_obj, expected_type):
    """Test that get_reddit_object_type returns the right object types"""
    assert get_reddit_object_type(reddit_obj) == expected_type


def test_gen_post_id():
    """Test that gen_post_id returns an expected id"""
    return gen_post_id('1') == 'p_1'


def test_gen_comment_id():
    """Test that gen_comment_id returns an expected id"""
    return gen_comment_id('1') == 'c_1'


@pytest.mark.parametrize('banned_by_val,approved_by_val,expected_value', [
    ('admin_username', '', True),
    ('admin_username', None, True),
    ('admin_username', 'admin_username', False),
    ('', None, False),
    (None, None, False),
])
def test_is_reddit_object_removed(mocker, banned_by_val, approved_by_val, expected_value):
    """
    Tests that is_reddit_object_removed returns the expected values based on the
    banned_by and approved_by properties for the given object
    """
    reddit_obj = mocker.Mock(banned_by=banned_by_val, approved_by=approved_by_val)
    assert is_reddit_object_removed(reddit_obj) is expected_value