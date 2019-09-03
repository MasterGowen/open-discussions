//@flow
import { concat, isNil } from "ramda"

import {
  COURSE_ARCHIVED,
  COURSE_AVAILABLE_NOW,
  COURSE_CURRENT,
  COURSE_PRIOR,
  LR_TYPE_USERLIST
} from "./constants"
import { capitalize, emptyOrNil } from "./util"
import { AVAILABILITY_MAPPING, AVAILABLE_NOW } from "./search"
import moment from "moment"
import { dateFormat } from "../factories/learning_resources"
import type { CourseRun } from "../flow/discussionTypes"

export const availabilityFacetLabel = (availability: ?string) => {
  const facetKey = availability ? AVAILABILITY_MAPPING[availability] : null
  return facetKey ? facetKey.label : availability
}

export const availabilityLabel = (availability: ?string) => {
  switch (availability) {
  case COURSE_CURRENT:
    return COURSE_AVAILABLE_NOW
  case COURSE_ARCHIVED:
    return COURSE_PRIOR
  default:
    return availability
  }
}

export const parseDateFilter = filter => {
  const format = /(now)(\+)?(\d+)?([Md])?/
  const match = format.exec(filter)
  if (match) {
    let dt = moment()
    if (match[3] && match[4]) {
      dt = dt.add(match[3], match[4] === "d" ? "days" : "months")
    }
    return dt
  }
}

export const inDateRanges = (run: CourseRun, availabilities: Array<string>) => {
  let inRange = false
  availabilities.forEach(availability => {
    if (AVAILABILITY_MAPPING[availability]) {
      const from = parseDateFilter(
        AVAILABILITY_MAPPING[availability].filter.from
      )
      const to = parseDateFilter(AVAILABILITY_MAPPING[availability].filter.to)
      const start_date = run.best_start_date
        ? moment(run.best_start_date, dateFormat)
        : null
      if (
        ((isNil(start_date) && availability === AVAILABLE_NOW) ||
          isNil(from) ||
          start_date >= from) &&
        ((isNil(start_date) && availability === AVAILABLE_NOW) ||
          isNil(to) ||
          start_date <= to)
      ) {
        inRange = true
      }
    }
  })
  return inRange
}

export const bestRunLabel = (run: CourseRun) => {
  if (!run) {
    return AVAILABILITY_MAPPING[AVAILABLE_NOW].label
  }
  for (const range in AVAILABILITY_MAPPING) {
    if (inDateRanges(run, [range])) {
      return AVAILABILITY_MAPPING[range].label
    }
  }
}

export const dateOrNull = dateString =>
  dateString ? moment(dateString, dateFormat) : null

export const compareRuns = (firstRun, secondRun) =>
  moment(firstRun.best_start_date, dateFormat) -
  moment(secondRun.best_start_date, dateFormat)

export const bestRun = (runs: Array<CourseRun>) => {
  const now = moment()

  // Runs that are running right now
  const currentRuns = runs.filter(
    run =>
      dateOrNull(run.best_start_date) <= now &&
      (dateOrNull(run.best_end_date) > now || isNil(run.best_end_date))
  )
  if (!emptyOrNil(currentRuns)) {
    //throw 'current ' + currentRuns[0].best_start_date
    return currentRuns[0]
  }

  // The next future run
  const futureRuns = runs
    .filter(run => dateOrNull(run.best_start_date) > now)
    .sort(compareRuns)
  if (!emptyOrNil(futureRuns)) {
    //throw 'future ' + futureRuns[0].best_start_date
    return futureRuns[0]
  }

  // The most recent run that "ended"
  const mostRecentRuns = runs
    .filter(run => dateOrNull(run.best_start_date) <= now)
    .sort(compareRuns)
    .reverse()
  if (!emptyOrNil(mostRecentRuns)) {
    //throw 'past ' + mostRecentRuns[0].best_start_date
    return mostRecentRuns[0]
  }
}

export const filterRunsByAvailability = (runs, availabilities) =>
  runs.filter(
    run => (availabilities ? inDateRanges(run, availabilities) : true)
  )

export const resourceLabel = (resource: string) => {
  return resource === LR_TYPE_USERLIST
    ? "Learning Paths"
    : concat(capitalize(resource), "s")
}

export const maxPrice = (courseRun: CourseRun) => {
  const prices = !emptyOrNil(courseRun) ? courseRun.prices : []
  const price = Math.max(...prices.map(price => price.price))
  return price > 0 ? `$${price}` : "Free"
}

export const minPrice = (courseRun: CourseRun) => {
  const prices = !emptyOrNil(courseRun) ? courseRun.prices : []
  const price = Math.min(...prices.map(price => price.price))
  return price > 0 && price !== Infinity ? `$${price}` : "Free"
}
