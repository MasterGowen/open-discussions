// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"
import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import Checkbox from "rmwc/Checkbox/index"

import CanonicalLink from "../components/CanonicalLink"
import Card from "../components/Card"
import { Cell, Grid } from "../components/Grid"
import {
  CourseSearchLoading,
  Loading,
  PostLoading,
  withLoading
} from "../components/Loading"
import SearchTextbox from "../components/SearchTextbox"
import SearchResult from "../components/SearchResult"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import { COURSE_AVAILABILITIES } from "../lib/constants"
import { SEARCH_FILTER_COURSE } from "../lib/picker"
import { preventDefaultAndInvoke, toArray } from "../lib/util"
import { validateSearchQuery } from "../lib/validation"

import type {
  SearchInputs,
  SearchParams,
  Result,
  CourseFacetResult
} from "../flow/searchTypes"

type Props = {
  dispatch: Dispatch<any>,
  location: Location,
  history: Object,
  initialLoad: boolean,
  isModerator: boolean,
  match: Match,
  runSearch: (params: SearchParams) => Promise<*>,
  results: Array<Result>,
  searchLoaded: boolean,
  loaded: boolean,
  searchProcessing: boolean,
  total: number,
  clearSearch: () => void,
  facetChoices: CourseFacetResult,
  facetChoiceProcessing: boolean
}
type State = {
  text: string,
  topics: Array<string>,
  platforms: Array<string>,
  availabilities: Array<string>,
  from: number,
  error: ?string
}

export class CourseSearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text:           qs.parse(props.location.search).q,
      topics:         qs.parse(props.location.search).t,
      platforms:      qs.parse(props.location.search).p,
      availabilities: qs.parse(props.location.search).a,
      from:           0,
      error:          null
    }
  }

  componentDidMount() {
    const { text } = this.state
    const { clearSearch, loaded, facetChoiceProcessing } = this.props
    clearSearch()
    if (!loaded && !facetChoiceProcessing) {
      this.loadFacetChoices()
    }
    if (text) {
      this.runSearch()
    }
  }

  loadFacetChoices = async () => {
    const { dispatch } = this.props
    dispatch(actions.coursefacets.get())
  }

  loadMore = async () => {
    const { searchLoaded } = this.props

    if (!searchLoaded) {
      // this function will be triggered repeatedly by <InfiniteScroll />, filter it to just once at a time
      return
    }

    await this.runSearch({
      incremental: true
    })
  }

  runSearch = async (params: SearchInputs = { incremental: false }) => {
    const {
      clearSearch,
      history,
      location: { pathname, search },
      runSearch
    } = this.props

    const text = params.text || this.state.text || undefined
    const platforms = params.platforms || this.state.platforms || undefined
    const topics = params.topics || this.state.topics || undefined
    const availabilities =
      params.availabilities || this.state.availabilities || undefined

    const error = validateSearchQuery(text)
    if (error) {
      clearSearch()
      this.setState({ error })
      return
    }

    const type = SEARCH_FILTER_COURSE
    history.replace({
      pathname: pathname,
      search:   qs.stringify({
        ...qs.parse(search),
        q: text,
        type,
        p: platforms,
        t: topics,
        a: availabilities
      })
    })
    let from = this.state.from + SETTINGS.search_page_size
    if (!params.incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from, error })
    await runSearch({
      channelName:    null,
      text,
      type,
      from,
      size:           SETTINGS.search_page_size,
      platforms:      toArray(platforms),
      topics:         toArray(topics),
      availabilities: toArray(availabilities)
    })
  }

  onUpdateFacets = async (e: Object) => {
    const { text } = this.state
    if (e.target.checked) {
      await this.setState({
        [e.target.name]: _.union(this.state[e.target.name], [e.target.value])
      })
    } else {
      await this.setState({
        [e.target.name]: _.without(this.state[e.target.name], e.target.value)
      })
    }
    if (text) {
      this.runSearch()
    }
  }

  updateText = (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    this.setState({ text })
  }

  renderResults = () => {
    const { results, searchProcessing, initialLoad, total } = this.props
    const { from } = this.state

    if (searchProcessing && initialLoad) {
      return <PostLoading />
    }

    if (!results.length) {
      return (
        <div className="empty-list-msg">There are no results to display.</div>
      )
    }

    return (
      <InfiniteScroll
        // TODO: fix
        hasMore={from + SETTINGS.search_page_size < total}
        loadMore={this.loadMore}
        initialLoad={from === 0}
        loader={<Loading className="infinite" key="loader" />}
      >
        {results.map((result, i) => <SearchResult key={i} result={result} />)}
      </InfiniteScroll>
    )
  }

  render() {
    const { match, facetChoices } = this.props
    const { text, error, topics, platforms, availabilities } = this.state

    return (
      <Grid className="main-content two-column search-page">
        <Cell width={12}>
          <MetaTags>
            <CanonicalLink match={match} />
          </MetaTags>
          <div className="course-search-input">
            <SearchTextbox
              onChange={this.updateText}
              value={text || ""}
              onClear={this.updateText}
              onSubmit={preventDefaultAndInvoke(() => this.runSearch())}
              validation={error}
            />
          </div>
        </Cell>
        <Cell width={4}>
          <Card>
            <div className="course-facets">
              <div className="facet-title">Subject area</div>
              {_.sortBy(facetChoices.topics).map((topic, i) => (
                <div key={i}>
                  <Checkbox
                    name="topics"
                    value={topic}
                    checked={R.contains(topic, topics || [])}
                    onChange={this.onUpdateFacets}
                  >
                    {topic}
                  </Checkbox>
                </div>
              ))}
            </div>

            <div className="course-facets">
              <div className="facet-title divider">Availability</div>
              {COURSE_AVAILABILITIES.map((availability, i) => (
                <div key={i}>
                  <Checkbox
                    name="availabilities"
                    value={availability}
                    checked={R.contains(availability, availabilities || [])}
                    onChange={this.onUpdateFacets}
                  >
                    {_.capitalize(availability)}
                  </Checkbox>
                </div>
              ))}
            </div>
            <div className="course-facets">
              <div className="facet-title divider">Platforms</div>
              {_.sortBy(facetChoices.platforms).map((platform, i) => (
                <div key={i}>
                  <Checkbox
                    name="platforms"
                    value={platform}
                    checked={R.contains(platform, platforms || [])}
                    onChange={this.onUpdateFacets}
                  >
                    {_.upperCase(platform)}
                  </Checkbox>
                </div>
              ))}
            </div>
          </Card>
        </Cell>
        <Cell width={8}>{error ? null : this.renderResults()}</Cell>
      </Grid>
    )
  }
}

const mapStateToProps = state => {
  const { search, coursefacets } = state
  const facetChoices = coursefacets.data || []
  const factorChoiceProcessing = coursefacets.processing
  const searchLoaded = search.loaded
  const searchProcessing = search.processing
  const { results, total, initialLoad } = search.data

  return {
    results,
    total,
    initialLoad,
    loaded:                coursefacets.loaded,
    facetChoices:          facetChoices,
    facetChoiceProcessing: factorChoiceProcessing,
    searchLoaded,
    searchProcessing
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  runSearch: async (params: SearchParams) => {
    return await dispatch(actions.search.post(params))
  },
  clearSearch: async () => {
    dispatch(actions.search.clear())
    await dispatch(clearSearch())
  },
  dispatch
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withLoading(CourseSearchLoading)
)(CourseSearchPage)