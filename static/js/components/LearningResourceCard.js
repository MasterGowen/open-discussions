// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"
import { mutateAsync } from "redux-query"
import { connect } from "react-redux"

import Card from "./Card"

import { availabilityLabel, minPrice } from "../lib/learning_resources"
import {
  embedlyThumbnail,
  starSelectedURL,
  starUnselectedURL
} from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platforms,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_USERLIST,
  LR_TYPE_PROGRAM,
  COURSE_AVAILABLE_NOW,
  platformReadableNames,
  readableLearningResources
} from "../lib/constants"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteBootcampMutation } from "../lib/queries/bootcamps"
import { favoriteProgramMutation } from "../lib/queries/programs"
import { favoriteUserListMutation } from "../lib/queries/user_lists"
import { SEARCH_GRID_UI, SEARCH_LIST_UI } from "../lib/search"

import type { LearningResourceSummary } from "../flow/discussionTypes"

type OwnProps = {|
  object: LearningResourceSummary,
  setShowResourceDrawer: Function,
|}

type DispatchProps = {|
  toggleFavorite: Function
|}

type Props = {|
  ...OwnProps,
  ...DispatchProps
|}

const getPlatform = (object: LearningResourceSummary): string => {
  if (object.object_type === LR_TYPE_COURSE) {
    // $FlowFixMe: only a course will reach this line
    return object.offered_by || object.platform
  } else if (object.object_type === LR_TYPE_BOOTCAMP) {
    return platforms.bootcamps
  } else {
    return object.offered_by || ""
  }
}

const getPlatformName = object => platformReadableNames[getPlatform(object)]

const getClassName = searchResultUI =>
  `learning-resource-card ${
    searchResultUI === SEARCH_LIST_UI ? "list-view" : ""
  }`.trim()

const formatTopics = (topics: Array<string>) =>
  topics.map(topic => topic.name).join(" ")

const Subtitle = ({ label, content }) => (
  <div className="row subtitle">
    <div className="lr-subtitle">
      <span className="grey">{label}</span>
      {content}
    </div>
  </div>
)

const CoverImage = ({ object, showResourceDrawer }) =>
      <div className="cover-image" onClick={showResourceDrawer}>
        <img
          src={embedlyThumbnail(
            SETTINGS.embedlyKey,
            object.image_src || "",
            CAROUSEL_IMG_HEIGHT,
            CAROUSEL_IMG_WIDTH
          )}
          height={CAROUSEL_IMG_HEIGHT}
          alt={`cover image for ${object.title}`}
        />
      </div>

export const LearningResourceCard = ({
  object,
  setShowResourceDrawer,
  toggleFavorite,
  searchResultUI
}: Props) => {
  const showResourceDrawer = () =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: object.object_type
    })

  return (
    <Card
      className={getClassName(searchResultUI)}
      borderless={searchResultUI === SEARCH_GRID_UI}
    >
      {searchResultUI === SEARCH_GRID_UI ? <CoverImage object={object} showResourceDrawer={showResourceDrawer} /> : null }
      <div className="lr-info">
        <div className="row resource-type">
          { readableLearningResources[object.object_type] }
        </div>
        <div className="row course-title" onClick={showResourceDrawer}>
          <Dotdotdot clamp={2}>{object.title}</Dotdotdot>
        </div>
        <Subtitle
          content={getPlatformName(object)}
          label="Offered by - "
        />
        <Subtitle content={formatTopics(object.topics)} label="Subject - " />
        <div className="row availability-price-favorite">
          <div className="price grey-surround">
            <i className="material-icons attach_money">attach_money</i>
            {minPrice(object)}
          </div>
          <div className="availability grey-surround">
            <i className="material-icons calendar_today">calendar_today</i>
            {availabilityLabel(object.availability || COURSE_AVAILABLE_NOW)}
          </div>
          <div className="favorite grey-surround">
            <img
              className="favorite"
              src={
                // $FlowFixMe
                object.is_favorite ? starSelectedURL : starUnselectedURL
              }
              onClick={() => toggleFavorite(object)}
            />
          </div>
        </div>
      </div>
      {searchResultUI === SEARCH_GRID_UI ? null : <CoverImage object={object} showResourceDrawer={showResourceDrawer} />}
    </Card>
  )
}

const mapDispatchToProps = dispatch => ({
  toggleFavorite: payload => {
    if (payload.object_type === LR_TYPE_COURSE) {
      dispatch(mutateAsync(favoriteCourseMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_BOOTCAMP) {
      dispatch(mutateAsync(favoriteBootcampMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_PROGRAM) {
      dispatch(mutateAsync(favoriteProgramMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_USERLIST) {
      dispatch(mutateAsync(favoriteUserListMutation(payload)))
    }
  }
})

export default connect<Props, OwnProps, _, _, _, _>(
  null,
  mapDispatchToProps
)(LearningResourceCard)
