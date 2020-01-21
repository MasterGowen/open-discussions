"""Constants for channels"""
from enum import Enum, auto


CHANNEL_TYPE_PUBLIC = "public"
CHANNEL_TYPE_RESTRICTED = "restricted"
CHANNEL_TYPE_PRIVATE = "private"

VALID_CHANNEL_TYPES = (
    CHANNEL_TYPE_PRIVATE,
    CHANNEL_TYPE_PUBLIC,
    CHANNEL_TYPE_RESTRICTED,
)

VALID_CHANNEL_CHOICES = zip(
    VALID_CHANNEL_TYPES, map(str.capitalize, VALID_CHANNEL_TYPES)
)

LINK_TYPE_ANY = "any"
LINK_TYPE_LINK = "link"
LINK_TYPE_SELF = "self"

VALID_LINK_TYPES = (LINK_TYPE_ANY, LINK_TYPE_LINK, LINK_TYPE_SELF)

EXTENDED_POST_TYPE_ARTICLE = "article"

VALID_EXTENDED_POST_TYPES = (LINK_TYPE_LINK, LINK_TYPE_SELF, EXTENDED_POST_TYPE_ARTICLE)
VALID_EXTENDED_POST_CHOICES = list(
    zip(VALID_EXTENDED_POST_TYPES, VALID_EXTENDED_POST_TYPES)
)

POSTS_SORT_HOT = "hot"
POSTS_SORT_TOP = "top"
POSTS_SORT_NEW = "new"

VALID_POST_SORT_TYPES = (POSTS_SORT_HOT, POSTS_SORT_TOP, POSTS_SORT_NEW)

COMMENTS_SORT_BEST = "best"
COMMENTS_SORT_NEW = "new"
COMMENTS_SORT_OLD = "old"

VALID_COMMENT_SORT_TYPES = (COMMENTS_SORT_BEST, COMMENTS_SORT_NEW, COMMENTS_SORT_OLD)

POST_TYPE = "post"
COMMENT_TYPE = "comment"

ROLE_MODERATORS = "moderators"
ROLE_CONTRIBUTORS = "contributors"
ROLE_CHOICES = (ROLE_MODERATORS, ROLE_CONTRIBUTORS)

WIDGET_LIST_CHANGE_PERM = "widgets.change_widgetlist"

DELETED_COMMENT_OR_POST_TEXT = "[deleted]"

VALID_COURSE_CONTENT_TYPES = ("file", "page")
VALID_COURSE_CONTENT_CHOICES = zip(VALID_COURSE_CONTENT_TYPES, VALID_COURSE_CONTENT_TYPES)


class VoteActions(Enum):
    """An enum indicating the valid vote actions that can be taken for a post or comment"""

    UPVOTE = auto()
    DOWNVOTE = auto()
    CLEAR_UPVOTE = auto()
    CLEAR_DOWNVOTE = auto()
