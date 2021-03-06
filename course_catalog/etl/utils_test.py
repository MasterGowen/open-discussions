"""ETL utils test"""
import datetime
import json

import pytest
import pytz

from course_catalog.etl.utils import (
    log_exceptions,
    sync_s3_text,
    extract_text_metadata,
    generate_unique_id,
    strip_extra_whitespace,
    parse_dates,
    map_topics,
)


@pytest.mark.parametrize("side_effect", ["One", Exception("error")])
def test_log_exceptions(mocker, side_effect):
    """Test that log_exceptions executes the function and absorbs exceptions"""
    func = mocker.Mock(
        side_effect=side_effect
        if isinstance(side_effect, Exception)
        else lambda *args, **kwargs: side_effect
    )
    wrapped_func = log_exceptions("Error message", exc_return_value="Error Value")(func)
    mock_log = mocker.patch("course_catalog.etl.utils.log")

    result = wrapped_func(1, 2, val=3)

    if isinstance(side_effect, Exception):
        mock_log.exception.assert_called_once_with("Error message")
        assert result == "Error Value"
    else:
        mock_log.exception.assert_not_called()
        assert result == side_effect

    func.assert_called_once_with(1, 2, val=3)


@pytest.mark.parametrize("has_bucket", [True, False])
@pytest.mark.parametrize("metadata", [None, {"foo": "bar"}])
def test_sync_s3_text(mock_ocw_learning_bucket, has_bucket, metadata):
    """
    Verify data is saved to S3 if a bucket and metadata are provided
    """
    key = "fake_key"
    sync_s3_text(mock_ocw_learning_bucket.bucket if has_bucket else None, key, metadata)
    s3_objects = [
        s3_obj
        for s3_obj in mock_ocw_learning_bucket.bucket.objects.filter(
            Prefix=f"extracts/{key}"
        )
    ]
    assert len(s3_objects) == (1 if has_bucket and metadata is not None else 0)


@pytest.mark.parametrize("token", ["abc123", "", None])
@pytest.mark.parametrize("data", [b"data", b"", None])
@pytest.mark.parametrize("headers", [None, {"a": "header"}])
def test_extract_text_metadata(mocker, data, token, settings, headers):
    """
    Verify that tika is called and returns a response
    """
    settings.TIKA_ACCESS_TOKEN = token
    mock_response = {"metadata": {"Author:": "MIT"}, "content": "Extracted text"}
    mock_tika = mocker.patch(
        "course_catalog.etl.utils.tika_parser.from_buffer", return_value=mock_response
    )
    response = extract_text_metadata(data, other_headers=headers)

    expected_headers = {}
    if token:
        expected_headers["X-Access-Token"] = token
    if headers:
        expected_headers = {**expected_headers, **headers}

    if data:
        assert response == mock_response
        mock_tika.assert_called_once_with(
            data,
            requestOptions={"headers": expected_headers} if expected_headers else {},
        )
    else:
        assert response is None
        mock_tika.assert_not_called()


@pytest.mark.parametrize(
    "url,uuid",
    [
        [
            "https://executive.mit.edu/openenrollment/program/managing-product-platforms",
            "6626ef0d6c8e3000a9ba7a7f509156aa",
        ],
        [
            "https://executive.mit.edu/openenrollment/program/negotiation-for-executives",
            "6b7d9f0b7a193048aae11054cbd38753",
        ],
    ],
)
def test_generate_unique_id(url, uuid):
    """Test that the same uuid is always created for a given URL"""
    assert generate_unique_id(url) == uuid


def test_strip_extra_whitespace():
    """Test that extra whitespace is removed from text"""
    text = " This\n\n is      a\t\ttest. "
    assert strip_extra_whitespace(text) == "This is a test."


def test_parse_dates():
    """Test that parse_dates returns correct dates"""
    for datestring in ("May 13-30, 2020", "May 13 - 30,2020"):
        assert parse_dates(datestring) == (
            datetime.datetime(2020, 5, 13, 12, tzinfo=pytz.utc),
            datetime.datetime(2020, 5, 30, 12, tzinfo=pytz.utc),
        )
    for datestring in ("Jun 24-Aug 11, 2020", "Jun  24 -  Aug 11,    2020"):
        assert parse_dates(datestring) == (
            datetime.datetime(2020, 6, 24, 12, tzinfo=pytz.utc),
            datetime.datetime(2020, 8, 11, 12, tzinfo=pytz.utc),
        )
    for datestring in ("Nov 25, 2020-Jan 26, 2021", "Nov 25,2020  -Jan   26,2021"):
        assert parse_dates(datestring) == (
            datetime.datetime(2020, 11, 25, 12, tzinfo=pytz.utc),
            datetime.datetime(2021, 1, 26, 12, tzinfo=pytz.utc),
        )
    assert parse_dates("This is not a date") is None


def test_map_topics(mocker):
    """Test that map_topics returns expected EdX topics"""
    mock_log = mocker.patch("course_catalog.etl.utils.log.exception")
    mapping = {
        "Innovation": ["Business & Management"],
        "Management & Engineering": ["Engineering", "Business & Management"],
        "Physics": ["Science"],
    }
    assert map_topics(["Physics", "Innovation"], mapping) == [
        "Business & Management",
        "Science",
    ]
    assert map_topics(["Management & Engineering", "Innovation"], mapping) == [
        "Business & Management",
        "Engineering",
    ]
    assert map_topics(["Physics", "Biology"], mapping) == ["Science"]
    mock_log.assert_called_once_with(
        "No topic mapping found for %s in %s", "Biology", json.dumps(mapping)
    )
