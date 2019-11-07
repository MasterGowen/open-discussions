// @flow
import { assert } from "chai"

import UserListFormDialog from "./UserListFormDialog"
import Dialog from "./Dialog"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeUserList } from "../factories/learning_resources"
import {
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_PUBLIC,
  LR_PRIVATE
} from "../lib/constants"
import { wait } from "../lib/util"
import { userListApiURL } from "../lib/url"
import { changeFormikInput } from "../lib/test_utils"

describe("UserListFormDialog", () => {
  let render, userList, helper, hideStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    hideStub = helper.sandbox.stub()
    render = helper.configureReduxQueryRenderer(UserListFormDialog, {
      hide: hideStub
    })
    userList = makeUserList()
    helper.handleRequestStub.withArgs(userListApiURL).returns(userList)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a form with all the right inputs", async () => {
    const { wrapper } = await render()
    assert.ok(wrapper.find('textarea[name="short_description"]').exists())
    assert.ok(wrapper.find('input[name="title"]').exists())
    const listType = wrapper.find(".radio").at(0)
    assert.ok(listType.find(`input[value="${LR_TYPE_USERLIST}"]`).exists())
    assert.ok(listType.find(`input[value="${LR_TYPE_LEARNINGPATH}"]`).exists())
    const privacy = wrapper.find(".radio").at(1)
    assert.ok(privacy.find(`input[value="${LR_PUBLIC}"]`).exists())
    assert.ok(privacy.find(`input[value="${LR_PRIVATE}"]`).exists())
  })

  it("should call validator, show the results", async () => {
    const { wrapper } = await render()
    wrapper.find("form").simulate("submit")
    await wait(50)
    wrapper.update()
    assert.deepEqual(
      [
        "You need to select a list type",
        "You need to select a privacy level",
        "Title is required",
        "Description is required"
      ],
      wrapper.find(".validation-message").map(el => el.text())
    )
  })

  it("should let you fill out the form and create a list", async () => {
    const { wrapper } = await render()
    changeFormikInput(
      wrapper.find(`input[value="${LR_TYPE_USERLIST}"]`),
      "list_type",
      LR_TYPE_USERLIST
    )
    changeFormikInput(
      wrapper.find(`input[value="${LR_PUBLIC}"]`),
      "privacy_level",
      LR_PUBLIC
    )
    changeFormikInput(wrapper.find('input[name="title"]'), "title", "Title")
    changeFormikInput(
      wrapper.find("textarea"),
      "short_description",
      "My Great Description"
    )
    wrapper.update()
    wrapper.find("form").simulate("submit")
    await wait(50)
    assert.ok(hideStub.called)
    const [url, method, { body }] = helper.handleRequestStub.args[0]
    assert.equal(url, `${userListApiURL}/`)
    assert.equal(method, "POST")
    assert.deepEqual(body, {
      title:             "Title",
      short_description: "My Great Description",
      list_type:         LR_TYPE_USERLIST,
      privacy_level:     LR_PUBLIC
    })
  })

  it("should pre-populate fields when you pass a list", async () => {
    const { wrapper } = await render({ userList })
    assert.equal(wrapper.find(Dialog).prop("title"), `Edit ${userList.title}`)
    assert.isTrue(
      wrapper.find(`input[value="${userList.list_type}"]`).prop("checked")
    )
    assert.isTrue(
      wrapper.find(`input[value="${userList.privacy_level}"]`).prop("checked")
    )
    assert.equal(
      wrapper.find('input[name="title"]').prop("value"),
      userList.title
    )
    assert.equal(
      wrapper.find("textarea").prop("value"),
      userList.short_description
    )
  })

  it("should let you edit and then patch a list", async () => {
    const { wrapper } = await render({ userList })
    changeFormikInput(
      wrapper.find('input[name="title"]'),
      "title",
      "My Brand New Title"
    )
    wrapper.update()
    wrapper.find("form").simulate("submit")
    await wait(50)
    assert.ok(hideStub.called)
    const [url, method, { body }] = helper.handleRequestStub.args[0]
    assert.equal(url, `${userListApiURL}/${userList.id}/`)
    assert.equal(method, "PATCH")
    assert.deepEqual(body, {
      title:             "My Brand New Title",
      short_description: userList.short_description,
      privacy_level:     userList.privacy_level,
      list_type:         userList.list_type,
      id:                userList.id
    })
  })
})