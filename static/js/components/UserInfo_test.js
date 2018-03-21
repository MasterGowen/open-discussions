/* global SETTINGS:false */
// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import UserInfo from "./UserInfo"

describe("UserInfo", () => {
  const renderUserInfo = () => shallow(<UserInfo />)

  it("should show nothing if relevant info is null", () => {
    [
      [null, "http://example.com/profile_image"],
      ["Full Name", null],
      [null, null]
    ].forEach(([name, imgUrl]) => {
      SETTINGS.user_full_name = name
      SETTINGS.profile_image_small = imgUrl

      const wrapper = renderUserInfo()
      assert.isNull(wrapper.type())
    })
  })

  it("should include the name and image, otherwise", () => {
    SETTINGS.user_full_name = "Full Name"
    SETTINGS.profile_image_small = "http://example.com/profile_image"
    const wrapper = renderUserInfo()
    assert.equal(wrapper.find("span").text().trim(), "Full Name")
    const img = wrapper.find("img")
    assert.deepEqual(img.props(), {
      className: "profile-image",
      src:       "http://example.com/profile_image"
    })
  })
})