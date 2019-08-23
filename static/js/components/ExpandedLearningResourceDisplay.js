// @flow
/* global SETTINGS: false */
import React from "react"
import _ from "lodash"
import moment from "moment"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import { platforms, LR_TYPE_COURSE } from "../lib/constants"
import { availabilityLabel, minPrice } from "../lib/learning_resources"
import { embedlyThumbnail } from "../lib/url"
import { languageName } from "../lib/util"

import type { Bootcamp, Course } from "../flow/discussionTypes"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: Course | Bootcamp,
  objectType: string
}

const getStartDate = (isCourse: boolean, object: Object) => {
  if (!isCourse || object.platform === platforms.edX) {
    if (object.course_runs[0].start_date) {
      return moment(object.course_runs[0].start_date).format("DD MMMM YYYY")
    } else {
      return availabilityLabel(object.course_runs[0].availability)
    }
  } else {
    return "Ongoing"
  }
}

const ExpandedLearningResourceDisplay = (props: Props) => {
  const { object, objectType } = props
  const isCourse = objectType === LR_TYPE_COURSE

  return (
    <div className="expanded-course-summary">
      <div className="summary">
        {object.image_src ? (
          <div className="course-image-div">
            <img
              src={embedlyThumbnail(
                SETTINGS.embedlyKey,
                object.image_src,
                COURSE_IMAGE_DISPLAY_HEIGHT,
                COURSE_IMAGE_DISPLAY_WIDTH
              )}
            />
          </div>
        ) : null}
        {object.url ? (
          <div className="course-links">
            <div>
              <a
                className="link-button"
                href={object.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {isCourse
                  ? // $FlowFixMe: only courses will end up here
                  `Take Course on ${object.platform.toUpperCase()}`
                  : "Take Bootcamp"}
              </a>
            </div>
          </div>
        ) : null}
        <div className="course-title">{object.title}</div>
        <div className="course-description">
          <ClampLines
            text={entities.decode(striptags(object.short_description))}
            lines={5}
            ellipsis="..."
            moreText="Read more"
            lessText="Read less"
          />
        </div>
        <div className="course-subheader row">Topics</div>
        <div className="course-topics">
          {object.topics.map((topic, i) => (
            <div className="grey-surround facet" key={i}>
              {topic.name}
            </div>
          ))}
        </div>
        <div className="course-subheader row">Info</div>
        <div className="course-info-row">
          <i className="material-icons history">history</i>
          <div className="course-info-label">
            {// $FlowFixMe: only courses will access platform
              !isCourse || object.platform === platforms.edX
                ? "As taught in"
                : "Semester"}:
          </div>
          <div className="course-info-value">
            {isCourse
              ? // $FlowFixMe: only courses will access semester
              `${_.capitalize(object.course_runs[0].semester)} `
              : null}
            {object.course_runs[0].year}
          </div>
        </div>
        <div className="course-info-row">
          <i className="material-icons calendar_today">calendar_today</i>
          <div className="course-info-label">Start date:</div>
          <div className="course-info-value">
            {getStartDate(isCourse, object)}
          </div>
        </div>
        <div className="course-info-row">
          <i className="material-icons attach_money">attach_money</i>
          <div className="course-info-label">Cost:</div>
          <div className="course-info-value">{minPrice(object)}</div>
        </div>
        {isCourse ? (
          <div className="course-info-row">
            <i className="material-icons bar_chart">bar_chart</i>
            <div className="course-info-label">Level:</div>
            <div className="course-info-value">
              {// $FlowFixMe: only courses will access level
                object.course_runs[0].level || "Unspecified"}
            </div>
          </div>
        ) : null}
        <div className="course-info-row">
          <i className="material-icons school">school</i>
          <div className="course-info-label">Instructors:</div>
          <div className="course-info-value">
            {_.join(
              object.course_runs[0].instructors.map(
                instructor =>
                  `Prof. ${instructor.first_name} ${instructor.last_name}`
              ),
              ", "
            )}
          </div>
        </div>
        <div className="course-info-row">
          <i className="material-icons language">language</i>
          <div className="course-info-label">Language:</div>
          <div className="course-info-value">
            {languageName(
              object.course_runs ? object.course_runs[0].language : "en"
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpandedLearningResourceDisplay
