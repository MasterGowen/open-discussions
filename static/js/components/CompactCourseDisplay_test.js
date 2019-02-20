// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"

import Router from "../Router"
import CompactCourseDisplay from "./CompactCourseDisplay"
import { makeCourse } from "../factories/courses"
import { courseAvailability, maxPrice } from "../lib/courses"
import { shouldIf } from "../lib/test_utils"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("CompactCourseDisplay", () => {
  let helper

  const renderCourseDisplay = props => {
    return mount(
      <Router store={helper.store} history={helper.browserHistory}>
        <CompactCourseDisplay {...props} />
      </Router>
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a course correctly", () => {
    const course = makeCourse()
    const wrapper = renderCourseDisplay({ course })
    assert.equal(wrapper.find(".course-title").text(), course.title)
    // $FlowFixMe: course.topics is not null here
    assert.equal(wrapper.find(".course-topics").text(), course.topics[0].name)
    assert.equal(
      wrapper.find(".course-platform").text(),
      course.platform.toUpperCase()
    )
    assert.equal(wrapper.find(".course-price").text(), maxPrice(course))
    assert.equal(
      wrapper.find(".course-availability").text(),
      courseAvailability(course)
    )
    assert.ok(
      wrapper
        .find("img")
        .prop("src")
        // $FlowFixMe: course.image_src is not null here
        .includes(encodeURIComponent(course.image_src))
    )
  })
  //
  ;[true, false].forEach(hasImage => {
    it(`${shouldIf(
      hasImage
    )} contain a column2 div and image thumbnail`, () => {
      const course = makeCourse()
      course.image_src = hasImage ? course.image_src : ""
      const wrapper = renderCourseDisplay({ course })
      assert.equal(wrapper.find(".column2").exists(), hasImage)
      assert.equal(wrapper.find("img").exists(), hasImage)
    })
  })
})