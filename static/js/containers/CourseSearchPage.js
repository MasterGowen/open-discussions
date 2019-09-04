// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"
import { connectRequest } from "redux-query-react"
import { compose } from "redux"
import debounce from "lodash/debounce"

import LearningResourceDrawer from "./LearningResourceDrawer"

import CanonicalLink from "../components/CanonicalLink"
import Card from "../components/Card"
import { Cell, Grid } from "../components/Grid"
import { Loading, PostLoading } from "../components/Loading"
import SearchFacet from "../components/SearchFacet"
import SearchFilter from "../components/SearchFilter"
import CourseSearchbox from "../components/CourseSearchbox"
import SearchResult from "../components/SearchResult"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"

import { actions } from "../actions"
import { setShowResourceDrawer } from "../actions/ui"
import { clearSearch } from "../actions/search"
import {
  availabilityFacetLabel,
  resourceLabel
} from "../lib/learning_resources"
import {
  LR_TYPE_ALL,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
} from "../lib/constants"
import { emptyOrNil, preventDefaultAndInvoke, toArray } from "../lib/util"
import {
  mergeFacetResults,
  SEARCH_GRID_UI,
  SEARCH_LIST_UI
} from "../lib/search"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
import {
  favoritesRequest,
  favoritesSelector
} from "../lib/queries/learning_resources"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type {
  SearchInputs,
  SearchParams,
  Result,
  FacetResult,
  CurrentFacet,
  LearningResourceResult
} from "../flow/searchTypes"

type OwnProps = {|
  dispatch: Dispatch<any>,
  location: Location,
  history: Object,
  isModerator: boolean,
  match: Match,
  runSearch: (params: SearchParams) => Promise<*>,
  clearSearch: () => void,
  setShowResourceDrawer: ({ objectId: string, objectType: string }) => void
|}

type StateProps = {|
  initialLoad: boolean,
  results: Array<Result>,
  facets: Map<string, FacetResult>,
  loaded: boolean,
  processing: boolean,
  total: number,
  favorites: Object
|}

type DispatchProps = {|
  runSearch: (params: SearchParams) => Promise<*>,
  clearSearch: () => Promise<*>,
  dispatch: Dispatch<*>
|}

type Props = {|
  ...OwnProps,
  ...StateProps,
  ...DispatchProps
|}

type State = {
  text: ?string,
  activeFacets: Map<string, Array<string>>,
  from: number,
  error: ?string,
  currentFacetGroup: ?CurrentFacet,
  incremental: boolean,
  searchResultLayout: string
}

const facetDisplayMap = [
  ["type", "Learning Resource", resourceLabel],
  ["topics", "Subject Area", null],
  ["availability", "Availability", availabilityFacetLabel],
  ["platform", "Platform", _.upperCase]
]

const shouldRunSearch = R.complement(R.eqProps("activeFacets"))

export class CourseSearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text:         qs.parse(props.location.search).q,
      activeFacets: new Map([
        ["type", _.union(toArray(qs.parse(props.location.search).type) || [])],
        ["platform", _.union(toArray(qs.parse(props.location.search).p) || [])],
        ["topics", _.union(toArray(qs.parse(props.location.search).t) || [])],
        [
          "availability",
          _.union(toArray(qs.parse(props.location.search).a) || [])
        ]
      ]),
      from:               0,
      error:              null,
      currentFacetGroup:  null,
      incremental:        false,
      searchResultLayout: SEARCH_GRID_UI
    }
  }

  componentDidMount() {
    const { clearSearch } = this.props
    clearSearch()
    this.runSearch()
  }

  componentDidUpdate(prevProps: Object, prevState: Object) {
    if (shouldRunSearch(prevState, this.state)) {
      this.debouncedRunSearch()
    }
  }

  clearAllFilters = async () => {
    this.setState({
      text:         null,
      activeFacets: new Map([
        ["platform", []],
        ["availability", []],
        ["topics", []],
        ["type", []]
      ]),
      currentFacetGroup: null
    })
  }

  mergeFacetOptions = (group: string) => {
    const { facets } = this.props
    const { activeFacets, currentFacetGroup } = this.state
    const emptyFacet = { buckets: [] }
    const emptyActiveFacets = {
      buckets: (activeFacets.get(group) || []).map(facet => ({
        key:       facet,
        doc_count: 0
      }))
    }

    if (!facets) {
      return null
    }

    if (currentFacetGroup && currentFacetGroup.group === group) {
      return mergeFacetResults(
        currentFacetGroup.result,
        emptyActiveFacets,
        facets.get(group) || emptyFacet
      )
    } else {
      return mergeFacetResults(
        facets.get(group) || emptyFacet,
        emptyActiveFacets
      )
    }
  }

  loadMore = async () => {
    const { loaded } = this.props

    if (!loaded) {
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

    const { activeFacets, text } = this.state

    history.replace({
      pathname: pathname,
      search:   qs.stringify({
        ...qs.parse(search),
        q:    text,
        type: activeFacets.get("type"),
        p:    activeFacets.get("platform"),
        t:    activeFacets.get("topics"),
        a:    activeFacets.get("availability")
      })
    })
    let from = this.state.from + SETTINGS.search_page_size

    const { incremental } = params
    if (!incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from, incremental })

    // clone the facts so we can search a default of searching all resources if type isn't specified
    const queryFacets = new Map(activeFacets)
    const type = queryFacets.get("type")
    queryFacets.set("type", emptyOrNil(type) ? LR_TYPE_ALL : type)
    await runSearch({
      channelName: null,
      text,
      type:        queryFacets.get("type"),
      // $FlowFixMe: type facet wont be undefined here
      facets:      queryFacets,
      from,
      size:        SETTINGS.search_page_size
    })
  }

  debouncedRunSearch = debounce(this.runSearch, 500)

  setSearchUI = (searchResultLayout: string) => {
    this.setState({
      searchResultLayout
    })
  }

  toggleFacet = async (name: string, value: string, isEnabled: boolean) => {
    const { activeFacets, currentFacetGroup } = this.state
    const { facets } = this.props
    const updatedFacets = new Map(activeFacets)
    const facetsGroup = facets.get(name) || { buckets: [] }
    if (isEnabled) {
      updatedFacets.set(name, _.union(activeFacets.get(name) || [], [value]))
    } else {
      updatedFacets.set(name, _.without(activeFacets.get(name) || [], value))
    }
    // $FlowFixMe: nothing undefined here
    this.setState({
      activeFacets:      updatedFacets,
      currentFacetGroup: {
        group:  name,
        result:
          currentFacetGroup && currentFacetGroup.group === name
            ? mergeFacetResults(currentFacetGroup.result, facetsGroup)
            : facetsGroup
      }
    })
  }

  onUpdateFacets = (e: Object) => {
    this.toggleFacet(e.target.name, e.target.value, e.target.checked)
  }

  updateText = async (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    await this.setState({ text, currentFacetGroup: null })
    if (!text) {
      this.runSearch()
    }
  }

  getFavoriteObject = (result: LearningResourceResult) => {
    const { favorites } = this.props
    const { bootcamps, courses, programs, userLists } = favorites
    switch (result.object_type) {
    case LR_TYPE_COURSE:
      return courses[result.id]
    case LR_TYPE_BOOTCAMP:
      return bootcamps[result.id]
    case LR_TYPE_PROGRAM:
      return programs[result.id]
    case LR_TYPE_USERLIST:
      return userLists[result.id]
    }
  }

  renderResults = () => {
    const {
      results,
      processing,
      loaded,
      total,
      setShowResourceDrawer
    } = this.props
    const { from, incremental, searchResultLayout, activeFacets } = this.state

    if ((processing || !loaded) && !incremental) {
      return <PostLoading />
    }

    if (total === 0 && !processing && loaded) {
      return (
        <div className="empty-list-msg">There are no results to display.</div>
      )
    }

    return (
      <InfiniteScroll
        hasMore={from + SETTINGS.search_page_size < total}
        loadMore={this.loadMore}
        initialLoad={from === 0}
        loader={<Loading className="infinite" key="loader" />}
      >
        <Grid>
          {results.map((result, i) => (
            <Cell
              width={searchResultLayout === SEARCH_GRID_UI ? 4 : 12}
              key={i}
            >
              <SearchResult
                result={result}
                overrideObject={
                  // $FlowFixMe
                  this.getFavoriteObject(result)
                }
                toggleFacet={this.toggleFacet}
                availabilities={activeFacets.get("availability")}
                setShowResourceDrawer={setShowResourceDrawer}
                searchResultLayout={searchResultLayout}
              />
            </Cell>
          ))}
        </Grid>
      </InfiniteScroll>
    )
  }

  render() {
    const { match } = this.props
    const { text, error, activeFacets, searchResultLayout } = this.state

    const anyFiltersActive =
      _.flatten(_.toArray(activeFacets.values())).length > 0

    return (
      <BannerPageWrapper>
        <MetaTags>
          <CanonicalLink match={match} />
        </MetaTags>
        <BannerPageHeader tall>
          <BannerContainer tall>
            <BannerImage src={COURSE_SEARCH_BANNER_URL} tall />
          </BannerContainer>
          <Grid>
            <Cell width={4}>
              <div className="course-catalog-title">
                <div className="title">Course Catalog</div>
              </div>
            </Cell>
            <Cell width={4}>
              <CourseSearchbox
                onChange={this.updateText}
                value={text || ""}
                onClear={this.updateText}
                onSubmit={preventDefaultAndInvoke(() => this.runSearch())}
                validation={error}
                autoFocus
              />
            </Cell>
          </Grid>
        </BannerPageHeader>
        <Grid className="main-content two-column-extrawide search-page">
          <Cell width={3} />
          <Cell width={9}>
            <div className="layout-buttons">
              <div
                onClick={() => this.setSearchUI(SEARCH_LIST_UI)}
                className={
                  searchResultLayout === SEARCH_LIST_UI ? "active" : ""
                }
              >
                <i className="material-icons view_list">view_list</i>
              </div>
              <div
                onClick={() => this.setSearchUI(SEARCH_GRID_UI)}
                className={
                  searchResultLayout === SEARCH_GRID_UI ? "active" : ""
                }
              >
                <i className="material-icons view_comfy">view_comfy</i>
              </div>
            </div>
          </Cell>
          <Cell className="search-filters" width={3}>
            <div className="active-search-filters">
              {anyFiltersActive ? (
                <div className="filter-section-title">
                  Filters
                  <span
                    className="clear-all-filters"
                    onClick={this.clearAllFilters}
                  >
                    Clear All
                  </span>
                </div>
              ) : null}
              {facetDisplayMap.map(([name, title, labelFunction]) =>
                (activeFacets.get(name) || []).map((facet, i) => (
                  <SearchFilter
                    key={i}
                    title={title}
                    value={facet}
                    clearFacet={() => this.toggleFacet(name, facet, false)}
                    labelFunction={labelFunction}
                  />
                ))
              )}
            </div>
            {facetDisplayMap.map(([name, title, labelFunction], i) => (
              <SearchFacet
                key={i}
                title={title}
                name={name}
                results={this.mergeFacetOptions(name)}
                onUpdate={this.onUpdateFacets}
                currentlySelected={activeFacets.get(name) || []}
                labelFunction={labelFunction}
              />
            ))}
          </Cell>
          <Cell width={9}>{error ? null : this.renderResults()}</Cell>
        </Grid>
        <LearningResourceDrawer />
      </BannerPageWrapper>
    )
  }
}

const mapStateToProps = (state): StateProps => {
  const { search } = state
  const { results, total, initialLoad, facets } = search.data

  return {
    results,
    facets,
    total,
    initialLoad,
    loaded:     search.loaded,
    processing: search.processing,
    favorites:  favoritesSelector(state)
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
  setShowResourceDrawer: ({
    objectId,
    objectType
  }: {
    objectId: string,
    objectType: string
  }) => {
    dispatch(setShowResourceDrawer({ objectId, objectType }))
  },
  dispatch
})

const mapPropsToConfig = () => [favoritesRequest()]

export default compose(
  connect<Props, OwnProps, _, _, _, _>(
    mapStateToProps,
    mapDispatchToProps
  ),
  connectRequest(mapPropsToConfig)
)(CourseSearchPage)
