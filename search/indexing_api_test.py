"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import pytest

from elasticsearch.exceptions import ConflictError
from channels.constants import (
    COMMENT_TYPE,
    POST_TYPE,
)
from search.connection import get_default_alias_name
from search.indexing_api import (
    clear_and_create_index,
    create_backing_index,
    create_document,
    update_field_values_by_query,
    get_reindexing_alias_name,
    update_document_with_partial,
    increment_document_integer_field,
    index_post_with_comments,
    switch_indices,
    GLOBAL_DOC_TYPE,
    SCRIPTING_LANG,
    UPDATE_CONFLICT_SETTING,
)


pytestmark = pytest.mark.django_db


@pytest.fixture()
def mocked_es(mocker, settings):
    """Mocked ES client objects/functions"""
    index_name = 'test'
    settings.ELASTICSEARCH_INDEX = index_name
    conn = mocker.Mock()
    get_conn_patch = mocker.patch('search.indexing_api.get_conn', autospec=True, return_value=conn)
    mocker.patch('search.connection.get_conn', autospec=True)
    default_alias = get_default_alias_name()
    reindex_alias = get_reindexing_alias_name()
    yield SimpleNamespace(
        get_conn=get_conn_patch,
        conn=conn,
        index_name=index_name,
        default_alias=default_alias,
        reindex_alias=reindex_alias,
        active_aliases=[default_alias, reindex_alias],
    )


def test_create_document(mocked_es):
    """
    Test that create_document gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ('doc_id', {'key1': 'value1'})
    create_document(doc_id, data)
    mocked_es.get_conn.assert_called_once_with(verify=True)
    for alias in mocked_es.active_aliases:
        mocked_es.conn.create.assert_any_call(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            body=data,
            id=doc_id,
        )


@pytest.mark.parametrize('version_conflicts,expected_error_logged', [
    (0, False),
    (1, True),
])
def test_update_field_values_by_query(mocker, mocked_es, version_conflicts, expected_error_logged):
    """
    Tests that update_field_values_by_query gets a connection, calls the correct elasticsearch-dsl function,
    and logs an error if the results indicate version conflicts
    """
    patched_logger = mocker.patch('search.indexing_api.log')
    query, field_name, field_value = ({"query": None}, 'field1', 'value1')
    mocked_es.conn.update_by_query.return_value = {'version_conflicts': version_conflicts}
    update_field_values_by_query(query, field_name, field_value)

    mocked_es.get_conn.assert_called_once_with(verify=True)
    for alias in mocked_es.active_aliases:
        mocked_es.conn.update_by_query.assert_any_call(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            conflicts=UPDATE_CONFLICT_SETTING,
            body={
                "script": {
                    "source": "ctx._source.{} = params.new_value".format(field_name),
                    "lang": SCRIPTING_LANG,
                    "params": {
                        "new_value": field_value
                    },
                },
                **query
            },
        )
    assert patched_logger.error.called is expected_error_logged


def test_update_document_with_partial(mocked_es):
    """
    Test that update_document_with_partial gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ('doc_id', {'key1': 'value1'})
    update_document_with_partial(doc_id, data)
    mocked_es.get_conn.assert_called_once_with(verify=True)
    for alias in mocked_es.active_aliases:
        mocked_es.conn.update.assert_any_call(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            body={'doc': data},
            id=doc_id,
        )


def test_update_partial_conflict_logging(mocker, mocked_es):
    """
    Test that update_document_with_partial logs an error if a version conflict occurs
    """
    patched_logger = mocker.patch('search.indexing_api.log')
    doc_id, data = ('doc_id', {'key1': 'value1'})
    mocked_es.conn.update.side_effect = ConflictError
    update_document_with_partial(doc_id, data)
    assert patched_logger.error.called is True


def test_increment_document_integer_field(mocked_es):
    """
    Test that increment_document_integer_field gets a connection and calls the
    correct elasticsearch-dsl function
    """
    doc_id, field_name, incr_amount = ('doc_id', 'some_field_name', 1)
    increment_document_integer_field(doc_id, field_name, incr_amount)
    mocked_es.get_conn.assert_called_once_with(verify=True)

    for alias in mocked_es.active_aliases:
        mocked_es.conn.update.assert_any_call(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            body={
                "script": {
                    "source": "ctx._source.{} += params.incr_amount".format(field_name),
                    "lang": SCRIPTING_LANG,
                    "params": {
                        "incr_amount": incr_amount
                    }
                }
            },
            id=doc_id,
        )


@pytest.mark.parametrize("skip_mapping", [True, False])
@pytest.mark.parametrize("already_exists", [True, False])
def test_clear_and_create_index(mocked_es, skip_mapping, already_exists):
    """
    clear_and_create_index should delete the index and create a new empty one with a mapping
    """
    index = 'index'

    conn = mocked_es.conn
    conn.indices.exists.return_value = already_exists

    clear_and_create_index(index_name=index, skip_mapping=skip_mapping)

    conn.indices.exists.assert_called_once_with(index)
    assert conn.indices.delete.called is already_exists
    if already_exists:
        conn.indices.delete.assert_called_once_with(index)

    assert conn.indices.create.call_count == 1
    assert conn.indices.create.call_args[0][0] == index
    body = conn.indices.create.call_args[1]['body']

    assert 'settings' in body
    assert 'mappings' not in body if skip_mapping else 'mappings' in body


def test_index_post_with_comments(mocked_es, mocker, settings, user):
    """
    index_post should index the post and all comments recursively
    """
    aliases = ['a', 'b']

    get_alias_mock = mocker.patch('search.indexing_api.get_active_aliases', autospec=True, return_value=aliases)
    api_mock = mocker.patch('channels.api.Api', autospec=True)
    serialized_data = [
        {
            'object_type': POST_TYPE,
        },
        {
            'object_type': COMMENT_TYPE,
        },
    ]
    serialize_mock = mocker.patch(
        'search.indexing_api.serialize_bulk_post_and_comments',
        autospec=True,
    )
    sync_mock = mocker.patch(
        'search.indexing_api.sync_post_and_comments',
        autospec=True,
        return_value=serialized_data,
    )
    bulk_mock = mocker.patch(
        'search.indexing_api.bulk', autospec=True, return_value=(0, []),
    )

    settings.INDEXING_API_USERNAME = user.username
    post_id = 'post_id'
    index_post_with_comments(post_id)

    get_alias_mock.assert_called_once_with()
    api_mock.assert_called_once_with(user)
    client = api_mock.return_value
    client.get_post.assert_called_once_with(post_id)
    post = client.get_post.return_value

    serialize_mock.assert_any_call(post)
    sync_mock.assert_any_call(serialize_mock.return_value)

    post.comments.replace_more.assert_called_once_with(limit=None)
    for alias in aliases:
        bulk_mock.assert_any_call(
            mocked_es.conn,
            serialized_data,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )


@pytest.mark.parametrize("default_exists", [True, False])
def test_switch_indices(mocked_es, mocker, default_exists):
    """
    switch_indices should atomically remove the old backing index
    for the default alias and replace it with the new one
    """
    refresh_mock = mocker.patch('search.indexing_api.refresh_index', autospec=True)
    conn_mock = mocked_es.conn
    conn_mock.indices.exists_alias.return_value = default_exists
    old_backing_index = 'old_backing'
    conn_mock.indices.get_alias.return_value.keys.return_value = [old_backing_index]

    backing_index = 'backing'
    switch_indices(backing_index)

    conn_mock.indices.delete_alias.assert_any_call(
        name=get_reindexing_alias_name(),
        index=backing_index,
    )
    default_alias = mocked_es.default_alias
    conn_mock.indices.exists_alias.assert_called_once_with(name=default_alias)

    actions = []
    if default_exists:
        actions.append({
            "remove": {
                "index": old_backing_index,
                "alias": default_alias,
            },
        })
    actions.append({
        "add": {
            "index": backing_index,
            "alias": default_alias,
        }
    })
    conn_mock.indices.update_aliases.assert_called_once_with({
        "actions": actions,
    })
    refresh_mock.assert_called_once_with(backing_index)
    if default_exists:
        conn_mock.indices.delete.assert_called_once_with(old_backing_index)
    else:
        assert conn_mock.indices.delete.called is False

    conn_mock.indices.delete_alias.assert_called_once_with(
        name=get_reindexing_alias_name(),
        index=backing_index,
    )


@pytest.mark.parametrize("temp_alias_exists", [True, False])
def test_create_backing_index(mocked_es, mocker, temp_alias_exists):
    """create_backing_index should make a new backing index and set the reindex alias to point to it"""
    conn_mock = mocked_es.conn
    conn_mock.indices.exists_alias.return_value = temp_alias_exists
    clear_and_create_mock = mocker.patch('search.indexing_api.clear_and_create_index', autospec=True)
    backing_index = 'backing'
    make_backing_index_mock = mocker.patch('search.indexing_api.make_backing_index_name', return_value=backing_index)

    assert create_backing_index() == backing_index

    reindexing_alias = get_reindexing_alias_name()
    get_conn_mock = mocked_es.get_conn
    get_conn_mock.assert_called_once_with(verify=False)
    make_backing_index_mock.assert_called_once_with()
    clear_and_create_mock.assert_called_once_with(index_name=backing_index)

    conn_mock.indices.exists_alias.assert_called_once_with(name=reindexing_alias)
    if temp_alias_exists:
        conn_mock.indices.delete_alias.assert_any_call(
            index="_all", name=reindexing_alias,
        )
    assert conn_mock.indices.delete_alias.called is temp_alias_exists

    conn_mock.indices.put_alias.assert_called_once_with(
        index=backing_index, name=reindexing_alias,
    )