// @flow
import { useCallback, useState } from "react"
import { useDispatch } from "react-redux"

import { actions } from "../actions"
import * as apiActions from "../util/api_actions"
import { setSnackbarMessage } from "../actions/ui"
import { formBeginEdit, formEndEdit } from "../actions/forms"
import {
  getReportForm,
  onReportUpdate,
  REPORT_CONTENT_NEW_FORM,
  REPORT_CONTENT_PAYLOAD
} from "../lib/reports"

export function useCommentVoting() {
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
  const [commentDeleteDialogOpen, setCommentDeleteDialogOpen] = useState(false)
  const [commentReportDialogOpen, setCommentReportDialogOpen] = useState(false)

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

  const showReportCommentDialog = useCallback(
    (comment: CommentInTree) => {
      dispatch(formBeginEdit({ ...REPORT_CONTENT_NEW_FORM }))
      setCommentReportDialogOpen(true)
    },
    [dispatch]
  )

  const hideReportCommentDialog = useCallback(() => {
    dispatch(formEndEdit({ ...REPORT_CONTENT_PAYLOAD }))
    setCommentReportDialogOpen(false)
  }, [dispatch])

  const reportComment = useCallback(async comment => {
    const { forms } = this.props
    const form = getReportForm(forms)
    const { reason } = form.value
    const validation = validateContentReportForm(form)

    if (!R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...REPORT_CONTENT_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      await dispatch(
        actions.reports.post({
          comment_id: focusedComment.id,
          reason: reason
        })
      )
      hideReportCommentDialog()
      dispatch(
        setSnackbarMessage({
          message: "Comment has been reported"
        })
      )
    }
  })

  return {
    commentRemoveDialogOpen,
    setCommentRemoveDialogOpen,
    commentDeleteDialogOpen,
    setCommentDeleteDialogOpen,
    ignoreReports,
    removeComment,
    approveComment,
    deleteComment,
    reportComment,
    showReportCommentDialog,
  hideReportCommentDialog,
  commentReportDialogOpen
  }
}
