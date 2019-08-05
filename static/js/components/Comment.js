// @flow
import React, { useState } from "react"
import R from "ramda"
import moment from "moment"
import { Link } from "react-router-dom"

import ReportCount from "./ReportCount"
import Card from "./Card"
import CommentForm from "../components/CommentForm"
import CommentVoteForm from "./CommentVoteForm"
import CommentRemovalForm from "./CommentRemovalForm"
import { renderTextContent } from "./Markdown"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "../containers/ProfileImage"
import DropdownMenu from "../components/DropdownMenu"
import ReplyButton from "./ReplyButton"
import SharePopup from "./SharePopup"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"
import { makeProfile } from "../lib/profile"
import { profileURL, absolutizeURL } from "../lib/url"

import type {
  GenericComment,
  CommentInTree,
  MoreCommentsInTree,
  Post
} from "../flow/discussionTypes"
import type { CommentRemoveFunc } from "./CommentRemovalForm"
import type { CommentVoteFunc } from "./CommentVoteForm"

function Comment(props) {
  const { commentPermalink, post, comment } = this.props

  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)

  return (
    <div className={`comment ${comment.removed ? "removed" : ""}`}>
      <Card>
        <Link to={profileURL(comment.author_id)}>
          <ProfileImage
            profile={makeProfile({
              name:                comment.author_name,
              username:            SETTINGS.username,
              profile_image_small: comment.profile_image
            })}
            imageSize={PROFILE_IMAGE_MICRO}
          />
        </Link>
        <div className="comment-contents">
          <div className="author-info">
            <Link to={profileURL(comment.author_id)}>
              <span className="author-name">{comment.author_name}</span>
            </Link>
            <Link to={commentPermalink(comment.id)}>
              <span className="authored-date">
                {moment(comment.created).fromNow()}
              </span>
            </Link>
            <span className="removed-note">
              {comment.removed ? (
                <span>[comment removed by moderator]</span>
              ) : null}
            </span>
          </div>
          <div className="row text">
            {editing && post ? (
              <CommentForm
                comment={comment}
                post={post}
                closeReply={() => {
                  setEditing(false)
                }}
                editing
                autoFocus
              />
            ) : (
              renderTextContent(comment)
            )}
          </div>
          {replying && post ? (
            <div>
              <CommentForm
                post={post}
                comment={comment}
                closeReply={() => {
                  setReplying(false)
                }}
                autoFocus
              />
            </div>
          ) : null}
          <CommentActions 
            comment={comment}
            atMaxDepth={atMaxDepth}
          />
        </div>
      </Card>
      {atMaxDepth ? null : (
        <div className="replies">
          {R.map(renderGenericComment, comment.replies || [])}
        </div>
      )}
    </div>
  )
}

function CommentActionsInner(props) {
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
    useSearchPageUI,
    comment
  } = this.props
  const { showDropdown, hideDropdown } = curriedDropdownMenufunc(
    commentDropdownKey(comment)
  )
  const {
    showDropdown: showShareMenu,
    hideDropdown: hideShareMenu
  } = curriedDropdownMenufunc(commentShareKey(comment))
  const commentMenuOpen = dropdownMenus.has(commentDropdownKey(comment))
  const commentShareOpen = dropdownMenus.has(commentShareKey(comment))

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
          <div
            className="comment-action-button share-button"
            onClick={showShareMenu}
          >
            share
          </div>
          {commentShareOpen ? (
            <SharePopup
              url={absolutizeURL(commentPermalink(comment.id))}
              closePopup={hideShareMenu}
              hideSocialButtons={isPrivateChannel}
            />
          ) : null}
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
