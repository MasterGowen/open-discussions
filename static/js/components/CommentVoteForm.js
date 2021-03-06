// @flow
import React from "react"

import LoginTooltip from "./LoginTooltip"

import { userIsAnonymous } from "../lib/util"

import type { CommentInTree } from "../flow/discussionTypes"

export type CommentVoteFunc = (comment: CommentInTree) => Promise<*>

type Props = {
  comment: CommentInTree,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc
}

type State = {
  downvoting: boolean,
  upvoting: boolean
}

export default class CommentVoteForm extends React.Component<Props, State> {
  constructor() {
    super()

    this.state = {
      downvoting: false,
      upvoting:   false
    }
  }

  upvote = async () => {
    const { upvote, comment } = this.props

    this.setState({
      upvoting: true
    })
    await upvote(comment)
    this.setState({
      upvoting: false
    })
  }

  downvote = async () => {
    const { downvote, comment } = this.props

    this.setState({
      downvoting: true
    })
    await downvote(comment)
    this.setState({
      downvoting: false
    })
  }

  render() {
    const { comment } = this.props
    const { upvoting, downvoting } = this.state

    const disabled = upvoting || downvoting

    // Use comment downvoted arrow, or if there's a downvote happening, show it as already downvoted.
    // Also make sure the upvote arrow is turned off if the downvote arrow is on.
    const downvoted = comment.downvoted !== downvoting && !upvoting
    const upvoted = comment.upvoted !== upvoting && !downvoting

    return (
      <div className="votes-form">
        <div className="score">{comment.score}</div>
        <LoginTooltip>
          <button
            className={`vote upvote-button ${upvoted ? "upvoted" : ""}`}
            onClick={userIsAnonymous() ? null : this.upvote}
            disabled={disabled}
          >
            <img
              className="vote-arrow"
              src={
                upvoted
                  ? "/static/images/upvote_arrow_on.png"
                  : "/static/images/upvote_arrow.png"
              }
              width="13"
            />
          </button>
        </LoginTooltip>
        <span className="pipe">|</span>
        <LoginTooltip>
          <button
            className={`vote downvote-button ${downvoted ? "downvoted" : ""}`}
            onClick={userIsAnonymous() ? null : this.downvote}
            disabled={disabled}
          >
            <img
              className="vote-arrow"
              src={
                downvoted
                  ? "/static/images/downvote_arrow_on.png"
                  : "/static/images/downvote_arrow.png"
              }
              width="13"
            />
          </button>
        </LoginTooltip>
      </div>
    )
  }
}
