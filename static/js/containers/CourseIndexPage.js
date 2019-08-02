// @flow
import React from "react"
import { connectRequest, querySelectors } from "redux-query"
import { connect } from "react-redux"
import { compose } from "redux"
import { Link } from "react-router-dom"

import LearningResourceDrawer from "./LearningResourceDrawer"

import CourseCarousel from "../components/CourseCarousel"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import { Cell, Grid } from "../components/Grid"
import CourseSearchbox from "../components/CourseSearchbox"

import { setShowResourceDrawer } from "../actions/ui"
import {
  featuredCoursesRequest,
  featuredCoursesSelector,
  upcomingCoursesRequest,
  upcomingCoursesSelector,
  newCoursesRequest,
  newCoursesSelector
} from "../lib/api/courses"
import { toQueryString, COURSE_SEARCH_URL, COURSE_BANNER_URL } from "../lib/url"

import type { Course } from "../flow/discussionTypes"

type OwnProps = {|
  history: Object
|}

type StateProps = {|
  featuredCourses: Array<Course>,
  upcomingCourses: Array<Course>,
  newCourses: Array<Course>,
  loaded: boolean
|}

type DispatchProps = {|
  setShowResourceDrawer: Function
|}

type Props = {|
  ...StateProps,
  ...OwnProps,
  ...DispatchProps
|}

export const CourseIndexPage = ({
  upcomingCourses,
  featuredCourses,
  newCourses,
  loaded,
  setShowResourceDrawer,
  history
}: Props) => (
  <BannerPageWrapper>
    <BannerPageHeader tall>
      <BannerContainer tall>
        <BannerImage src={COURSE_BANNER_URL} tall />
      </BannerContainer>
      <Grid>
        <Cell width={4} />
        <Cell className="course-searchbox-container" width={4}>
          <CourseSearchbox
            onSubmit={e => {
              const { value } = e.target
              const newLocation = `${COURSE_SEARCH_URL}${toQueryString({
                q: value
              })}`
              history.push(newLocation)
            }}
          />
          <Link className="link-button" to={COURSE_SEARCH_URL}>
            See All Courses
          </Link>
        </Cell>
      </Grid>
    </BannerPageHeader>
    <Grid className="main-content one-column">
      {loaded ? (
        <Cell width={12}>
          {featuredCourses.length !== 0 ? (
            <CourseCarousel
              title="Featured Courses"
              courses={featuredCourses}
              setShowResourceDrawer={setShowResourceDrawer}
            />
          ) : null}
          <CourseCarousel
            title="Upcoming Courses"
            courses={upcomingCourses}
            setShowResourceDrawer={setShowResourceDrawer}
          />
          <CourseCarousel
            title="New Courses"
            courses={newCourses}
            setShowResourceDrawer={setShowResourceDrawer}
          />
        </Cell>
      ) : (
        "loading"
      )}
    </Grid>
    <LearningResourceDrawer />
  </BannerPageWrapper>
)

const mapStateToProps = (state: Object): StateProps => ({
  featuredCourses: featuredCoursesSelector(state),
  upcomingCourses: upcomingCoursesSelector(state),
  newCourses:      newCoursesSelector(state),
  loaded:
    querySelectors.isFinished(state.queries, featuredCoursesRequest()) &&
    querySelectors.isFinished(state.queries, upcomingCoursesRequest()) &&
    querySelectors.isFinished(state.queries, newCoursesRequest())
})

const mapDispatchToProps = {
  setShowResourceDrawer
}

const mapPropsToConfig = () => [
  featuredCoursesRequest(),
  upcomingCoursesRequest(),
  newCoursesRequest()
]

export default compose(
  connect<Props, OwnProps, _, DispatchProps, _, _>(
    mapStateToProps,
    mapDispatchToProps
  ),
  connectRequest(mapPropsToConfig)
)(CourseIndexPage)
