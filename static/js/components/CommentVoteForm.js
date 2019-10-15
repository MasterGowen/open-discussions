// @flow
import React from "react"

import LoginTooltip from "./LoginTooltip"

import { userIsAnonymous } from "../lib/util"
import { useCommentVoting } from "../hooks/comments"

import type { CommentInTree } from "../flow/discussionTypes"

type Props = {
  comment: CommentInTree
}

export default function CommentVoteForm(props: Props) {
  const { comment } = props

  const { upvote, upvoting, downvote, downvoting } = useCommentVoting()
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
          onClick={
            userIsAnonymous() ? null : () => upvote(comment)
          }
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
          onClick={
            userIsAnonymous() ? null : () => downvote(comment)
          }
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
