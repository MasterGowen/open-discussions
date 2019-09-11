// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import moment from "moment"
import { Link } from "react-router-dom"

import ReportCount from "./ReportCount"
import Card from "./Card"
import SpinnerButton from "./SpinnerButton"
import CommentForm from "../components/CommentForm"
import CommentVoteForm from "./CommentVoteForm"
import CommentRemovalForm from "./CommentRemovalForm"
import { renderTextContent } from "./Markdown"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "./ProfileImage"
import DropdownMenu from "../components/DropdownMenu"
import ReplyButton from "./ReplyButton"
import ShareTooltip from "./ShareTooltip"
import Comment from "./Comment"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"
import { makeProfile } from "../lib/profile"
import { profileURL, absolutizeURL } from "../lib/url"

import type {
  GenericComment,
  CommentInTree,
  MoreCommentsInTree,
  Post
} from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { CommentRemoveFunc } from "./CommentRemovalForm"
import type { CommentVoteFunc } from "./CommentVoteForm"

type LoadMoreCommentsFunc = (comment: MoreCommentsInTree) => Promise<*>
type BeginEditingFunc = (fk: string, iv: Object, e: ?Object) => void
type ReportCommentFunc = (comment: CommentInTree) => void

type Props = {
  comments: Array<GenericComment>,
  forms?: FormsState,
  upvote?: CommentVoteFunc,
  downvote?: CommentVoteFunc,
  remove: CommentRemoveFunc,
  approve: CommentRemoveFunc,
  loadMoreComments?: LoadMoreCommentsFunc,
  isModerator: boolean,
  isPrivateChannel: boolean,
  processing?: boolean,
  deleteComment?: CommentRemoveFunc,
  reportComment?: ReportCommentFunc,
  commentPermalink: (commentID: string) => string,
  moderationUI?: boolean,
  ignoreCommentReports?: (c: CommentInTree) => void,
  curriedDropdownMenufunc: (key: string) => Object,
  dropdownMenus: Set<string>,
  useSearchPageUI?: boolean,
  post?: Post
}

export default class CommentTree extends React.Component<Props> {
  renderComment = (depth: number, comment: CommentInTree) => {
    const { commentPermalink, post } = this.props

    // ramda can't determine arity here so use curryN
    const renderGenericComment = R.curryN(2, this.renderGenericComment)(
      depth + 1
    )

    const atMaxDepth = depth + 1 >= SETTINGS.max_comment_depth

    return (
      <Comment
        comment={comment}
        post={post}
        atMaxDepth={atMaxDepth}
        commentPermalink={commentPermalink}
      >
        {atMaxDepth ? null : (
          <div className="replies">
            {R.map(renderGenericComment, comment.replies || [])}
          </div>
        )}
      </Comment>
    )
  }

  renderMoreComments = (comment: MoreCommentsInTree) => {
    const { loadMoreComments } = this.props
    return loadMoreComments ? (
      <div
        className="more-comments"
        key={`more-comments-${comment.parent_id || "null"}`} // will be null if parent_id is null, indicating root level
      >
        <SpinnerButton
          className="load-more-comments"
          onClickPromise={() => loadMoreComments(comment)}
        >
          Load More Comments
        </SpinnerButton>
      </div>
    ) : null
  }

  renderGenericComment = (depth: number, comment: GenericComment) => {
    if (comment.comment_type === "comment") {
      return this.renderComment(depth, comment)
    } else if (comment.comment_type === "more_comments") {
      return this.renderMoreComments(comment)
    } else {
      throw new Error("Unexpected comment_type")
    }
  }

  renderTopLevelComment = (comment: GenericComment, idx: number) => {
    return (
      <div className="top-level-comment" key={idx}>
        {this.renderGenericComment(0, comment)}
      </div>
    )
  }

  render() {
    const { comments } = this.props
    return (
      <div className="comments">
        {R.addIndex(R.map)(this.renderTopLevelComment, comments)}
      </div>
    )
  }
}
