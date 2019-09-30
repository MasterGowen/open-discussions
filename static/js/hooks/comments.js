// @flow
import { useCallback, useState } from "react"
import { useDispatch } from "react-redux"

import { actions } from "../actions"
import { approveComment, removeComment } from "../util/api_actions"
import { setSnackbarMessage } from "../actions/ui"
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

export const useCommentModeration = (shouldGetReports, channelName) => {
  const dispatch = useDispatch()

  const approveComment = useCallback(
    async (comment: CommentInTree) => {
      await approveComment(dispatch, comment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
      dispatch(
        setSnackbarMessage({
          message: "Comment has been approved"
        })
      )
    },
    [dispatch]
  )

  const removeComment = useCallback(
    async (event: Event) => {
      const {
        dispatch,
        focusedComment,
        channelName,
        shouldGetReports
      } = this.props
      event.preventDefault()

      await removeComment(dispatch, focusedComment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }

      this.hideCommentDialog()
      dispatch(
        setSnackbarMessage({
          message: "Comment has been removed"
        })
      )
    }

ignoreReports = async (comment: CommentInTree) => {
      const { dispatch, channelName, shouldGetReports } = this.props

      await dispatch(
        actions.comments.patch(comment.id, { ignore_reports: true })
      )
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
    }



}
