// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"

import AuthEmailForm from "./AuthEmailForm"

describe("AuthEmailForm component", () => {
  let sandbox, onSubmitStub, onUpdateStub, form
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onSubmitStub = sandbox.stub()
    onUpdateStub = sandbox.stub()
    form = {
      email: ""
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getEmailInput = wrapper => wrapper.find("input[name='email']")

  const mountForm = (props = {}) =>
    mount(
      <AuthEmailForm
        onSubmit={onSubmitStub}
        onUpdate={onUpdateStub}
        form={form}
        validation={{}}
        processing={false}
        formError={""}
        {...props}
      />
    )

  it("should render an initial form", () => {
    const wrapper = mountForm()

    assert.equal(getEmailInput(wrapper).props().value, "")
    assert.equal(wrapper.find(".validation-message").exists(), false)
    assert.equal(wrapper.find("button").props().disabled, false)
  })

  it("should disable the submit button if processing === true", () => {
    const wrapper = mountForm({ processing: true })

    assert.equal(wrapper.find("button").props().disabled, true)
  })

  it("should show validation", () => {
    const wrapper = mountForm({
      validation: {
        email: "Email is required"
      },
      formError: "error"
    })

    assert.equal(
      wrapper.find(".validation-message").text(),
      "Email is required"
    )

    // form level error shouldn't show
    assert.isNotOk(wrapper.find(".row.error .validation-message").exists())
  })

  it("should call onUpdate when the input text changes", () => {
    const wrapper = mountForm({ processing: true })
    const event = {
      target: {
        name:  "email",
        value: "user@localhost"
      }
    }
    getEmailInput(wrapper).simulate("change", event)
    sinon.assert.calledOnce(onUpdateStub)
    const eventArg = onUpdateStub.firstCall.args[0]
    assert.equal(eventArg.target.name, event.target.name)
    assert.equal(eventArg.target.value, event.target.value)
  })

  it("should call onSubmit when the form is submitted", () => {
    const wrapper = mountForm({ processing: true })
    wrapper.find("form").simulate("submit")
    sinon.assert.calledOnce(onSubmitStub)
  })
})
