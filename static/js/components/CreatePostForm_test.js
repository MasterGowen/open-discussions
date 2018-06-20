// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import CreatePostForm from "./CreatePostForm"
import Embedly from "./Embedly"

import { makeArticle } from "../factories/embedly"

describe("CreatePostForm", () => {
  it("should show an embedly preview when link post and non-error embedly object", () => {
    const errorArticle = makeArticle()
    errorArticle.type = "error"
    ;[
      [true, true, makeArticle()],
      [false, false, makeArticle()],
      [true, false, errorArticle],
      [true, false, undefined],
      [false, false, undefined]
    ].forEach(([linkPost, shouldShowEmbed, embedlyResponse]) => {
      const form = {
        isText: !linkPost,
        title:  "title"
      }
      const wrapper = shallow(
        <CreatePostForm
          postForm={form}
          embedly={embedlyResponse}
          validation={{}}
          channels={[]}
        />
      )
      assert.equal(shouldShowEmbed, wrapper.find(Embedly).exists())
    })
  })
})