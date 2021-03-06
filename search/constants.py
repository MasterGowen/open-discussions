""" Constants for search """
from channels.constants import POST_TYPE, COMMENT_TYPE

ALIAS_ALL_INDICES = "all"
PROFILE_TYPE = "profile"
COURSE_TYPE = "course"
RESOURCE_FILE_TYPE = "resourcefile"
BOOTCAMP_TYPE = "bootcamp"
PROGRAM_TYPE = "program"
USER_LIST_TYPE = "userlist"
LEARNING_PATH_TYPE = "learningpath"
VIDEO_TYPE = "video"

LEARNING_RESOURCE_TYPES = (
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    LEARNING_PATH_TYPE,
    VIDEO_TYPE,
)

VALID_OBJECT_TYPES = (
    POST_TYPE,
    COMMENT_TYPE,
    PROFILE_TYPE,
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    VIDEO_TYPE,
)
GLOBAL_DOC_TYPE = "_doc"
