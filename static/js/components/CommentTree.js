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
import Comment from './Comment'

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
  toggleFollowComment?: Function,
  curriedDropdownMenufunc: (key: string) => Object,
  dropdownMenus: Set<string>,
  useSearchPageUI?: boolean,
  post?: Post
}

type State = {
  editing: Set<string>,
  replying: Set<string>
}

export const commentDropdownKey = (c: CommentInTree) =>
  `COMMENT_DROPDOWN_${c.id}`

export const EDITING: "editing" = "editing"
export const REPLYING: "replying" = "replying"
type CommentStateKey = "editing" | "replying"

export default class CommentTree extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      editing:  new Set(),
      replying: new Set()
    }
  }

  renderFollowButton = (comment: CommentInTree) => {
    const { toggleFollowComment } = this.props

    return (
      <li>
        <div
          className={`comment-action-button subscribe-comment ${
            comment.subscribed ? "subscribed" : "unsubscribed"
          }`}
          onClick={preventDefaultAndInvoke(() => {
            if (toggleFollowComment) {
              toggleFollowComment(comment)
            }
          })}
        >
          <a href="#">{comment.subscribed ? "Unfollow" : "Follow"}</a>
        </div>
      </li>
    )
  }

  removeCommentFromState = (key: CommentStateKey, comment: CommentInTree) => {
    const newSet = new Set(this.state[key])
    newSet.delete(comment.id)
    this.setState({ [key]: newSet })
  }

  addCommentToState = (key: CommentStateKey, comment: CommentInTree) => {
    const current = this.state[key]
    current.add(comment.id)
    this.setState({ [key]: new Set(current) })
  }

  renderCommentActions = (comment: CommentInTree, atMaxDepth: boolean) => {
    const {
      upvote,
      downvote,
      approve,
      remove,
      deleteComment,
      isPrivateChannel,
      isModerator,
      reportComment,
      commentPermalink,
      moderationUI,
      ignoreCommentReports,
      curriedDropdownMenufunc,
      dropdownMenus,
      useSearchPageUI
    } = this.props
    const { showDropdown, hideDropdown } = curriedDropdownMenufunc(
      commentDropdownKey(comment)
    )
    const commentMenuOpen = dropdownMenus.has(commentDropdownKey(comment))

    return (
      <div className="row comment-actions">
        {upvote && downvote ? (
          <CommentVoteForm
            comment={comment}
            upvote={upvote}
            downvote={downvote}
          />
        ) : null}
        {atMaxDepth ||
        moderationUI ||
        comment.deleted ||
        useSearchPageUI ? null : (
            <ReplyButton
              beginEditing={e => {
                e.preventDefault()
                this.addCommentToState(REPLYING, comment)
              }}
            />
          )}
        {useSearchPageUI ? null : (
          <div className="share-button-wrapper">
            <ShareTooltip
              hideSocialButtons={isPrivateChannel}
              url={absolutizeURL(commentPermalink(comment.id))}
              objectType="comment"
            >
              <div className="comment-action-button share-button">share</div>
            </ShareTooltip>
          </div>
        )}
        {!userIsAnonymous() && !useSearchPageUI ? (
          <div>
            <i className="material-icons more_vert" onClick={showDropdown}>
              more_vert
            </i>
            {commentMenuOpen ? (
              <DropdownMenu
                closeMenu={hideDropdown}
                className="post-comment-dropdown"
              >
                {userIsAnonymous() ? null : this.renderFollowButton(comment)}
                {SETTINGS.username === comment.author_id && !moderationUI ? (
                  <li>
                    <div
                      className="comment-action-button edit-button"
                      onClick={e => {
                        e.preventDefault()
                        this.addCommentToState(EDITING, comment)
                      }}
                    >
                      <a href="#">Edit</a>
                    </div>
                  </li>
                ) : null}
                {SETTINGS.username === comment.author_id && deleteComment ? (
                  <li>
                    <div
                      className="comment-action-button delete-button"
                      onClick={preventDefaultAndInvoke(() =>
                        deleteComment(comment)
                      )}
                    >
                      <a href="#">Delete</a>
                    </div>
                  </li>
                ) : null}
                {comment.num_reports && ignoreCommentReports ? (
                  <li>
                    <div
                      className="comment-action-button ignore-button"
                      onClick={preventDefaultAndInvoke(() =>
                        ignoreCommentReports(comment)
                      )}
                    >
                      <a href="#">Ignore reports</a>
                    </div>
                  </li>
                ) : null}
                <li>
                  <CommentRemovalForm
                    comment={comment}
                    remove={remove}
                    approve={approve}
                    isModerator={isModerator}
                  />
                </li>
                {moderationUI || userIsAnonymous() || !reportComment ? null : (
                  <li>
                    <div
                      className="comment-action-button report-button"
                      onClick={preventDefaultAndInvoke(() =>
                        reportComment(comment)
                      )}
                    >
                      <a href="#">Report</a>
                    </div>
                  </li>
                )}
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
        <ReportCount count={comment.num_reports} />
      </div>
    )
  }

  renderComment = (depth: number, comment: CommentInTree) => {
    const { commentPermalink, post } = this.props
    const { editing, replying } = this.state
    // ramda can't determine arity here so use curryN
    const renderGenericComment = R.curryN(2, this.renderGenericComment)(
      depth + 1
    )

    const atMaxDepth = depth + 1 >= SETTINGS.max_comment_depth

    return (
      <React.Fragment>
        <Comment comment={comment} atMaxDepth={atMaxDepth} commentPermalink={commentPermalink} />
        {atMaxDepth ? null : (
          <div className="replies">
            {R.map(renderGenericComment, comment.replies || [])}
          </div>
        )}
      </React.Fragment>
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
