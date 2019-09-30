// @flow
import { useCallback, useState } from "react"
import { useDispatch } from "react-redux"

import { actions } from "../actions"
import * as apiActions from "../util/api_actions"
import { setSnackbarMessage } from "../actions/ui"

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

  return { upvote, upvoting, downvote, downvoting }
}

export const useCommentModeration = (shouldGetReports, channelName) => {
  const dispatch = useDispatch()
  const [commentRemoveDialogOpen, setCommentRemoveDialogOpen] = useState(false)

  const approveComment = useCallback(
    async (comment: CommentInTree) => {
      await apiActions.approveComment(dispatch, comment)
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
    async (comment: CommentInTree) => {
      await apiActions.removeComment(dispatch, comment)
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }

      setCommentRemoveDialogOpen(false)
      dispatch(
        setSnackbarMessage({
          message: "Comment has been removed"
        })
      )
    },
    [dispatch]
  )

  const ignoreReports = useCallback(
    async (comment: CommentInTree) => {
      await dispatch(
        actions.comments.patch(comment.id, { ignore_reports: true })
      )
      if (shouldGetReports) {
        await dispatch(actions.reports.get(channelName))
      }
    },
    [dispatch]
  )

  // ⚠️  this is a destructive action! ⚠️
  const deleteComment = useCallback(
    async (comment, post) => {
      await dispatch(actions.comments["delete"](post.id, comment.id))
      dispatch(
        setSnackbarMessage({
          message: "Comment has been deleted"
        })
      )
    },
    [dispatch]
  )

  return {
    commentRemoveDialogOpen,
    setCommentRemoveDialogOpen,
    ignoreReports,
    removeComment,
    approveComment,
    deleteComment
  }
}
