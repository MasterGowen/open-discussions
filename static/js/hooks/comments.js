// @flow
import { useCallback, useState } from "react"
import { useDispatch } from "react-redux"

import { actions } from "../actions"

export const useCommentVoting = () => {
  const dispatch = useDispatch()
  const [upvoting, setUpvoting] = useState(false)
  const [downvoting, setDownvoting] = useState(false)

  const upvote = useCallback(
    async comment => {
      setUpvoting(true)
      await dispatch(
        actions.comments.patch(comment.id, {
          upvoted: !comment.upvoted
        })
      )
      setUpvoting(false)
    },
    [dispatch]
  )

  const downvote = useCallback(
    async (comment: CommentInTree) => {
      setDownvoting(true)
      actions.comments.patch(comment.id, {
        downvoted: !comment.downvoted
      })
      setUpvoting(false)
    },
    [dispatch]
  )

  return {upvote, upvoting, downvote, downvoting}
}
