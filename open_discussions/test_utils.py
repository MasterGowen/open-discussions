"""Testing utils"""
import abc
import json
from contextlib import contextmanager
import traceback
from unittest.mock import Mock

import pytest


def any_instance_of(*classes):
    """
    Returns a type that evaluates __eq__ in isinstance terms

    Args:
        classes (list of types): variable list of types to ensure equality against

    Returns:
        AnyInstanceOf: dynamic class type with the desired equality
    """

    class AnyInstanceOf(abc.ABC):
        """Dynamic class type for __eq__ in terms of isinstance"""

        def __init__(self, classes):
            self.classes = classes

        def __eq__(self, other):
            return isinstance(other, self.classes)

        def __str__(self):  # pragma: no cover
            return f"AnyInstanceOf({', '.join([str(c) for c in self.classes])})"

        def __repr__(self):  # pragma: no cover
            return str(self)

    for c in classes:
        AnyInstanceOf.register(c)
    return AnyInstanceOf(classes)


@contextmanager
def assert_not_raises():
    """Used to assert that the context does not raise an exception"""
    try:
        yield
    except AssertionError:
        raise
    except Exception:  # pylint: disable=broad-except
        pytest.fail(f"An exception was not raised: {traceback.format_exc()}")


class MockResponse:
    """
    Mock requests.Response
    """

    def __init__(self, content, status_code):
        self.content = content
        self.status_code = status_code

    def json(self):
        """ Return content as json """
        return json.loads(self.content)


def drf_datetime(dt):
    """
    Returns a datetime formatted as a DRF DateTimeField formats it

    Args:
        dt(datetime): datetime to format

    Returns:
        str: ISO 8601 formatted datetime
    """
    return dt.isoformat().replace("+00:00", "Z")


def assert_json_equal(obj1, obj2):
    """
    Asserts that two objects are equal after a round trip through JSON serialization/deserialization.
    Particularly helpful when testing DRF serializers where you may get back OrderedDict and other such objects.

    Args:
        obj1 (object): the first object
        obj2 (object): the second object
    """
    converted1 = json.loads(json.dumps(obj1))
    converted2 = json.loads(json.dumps(obj2))
    assert converted1 == converted2


class PickleableMock(Mock):
    """
    A Mock that can be passed to pickle.dumps()

    Source: https://github.com/testing-cabal/mock/issues/139#issuecomment-122128815
    """

    def __reduce__(self):
        """Required method for being pickleable"""
        return (Mock, ())
