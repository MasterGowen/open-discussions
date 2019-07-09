// @flow
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
import type { FormsState } from "../flow/formTypes"
import type { CommentRemoveFunc } from "./CommentRemovalForm"
import type { CommentVoteFunc } from "./CommentVoteForm"

function Comment() {
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
            {editing.has(comment.id) && post ? (
              <CommentForm
                comment={comment}
                post={post}
                closeReply={() => {
                  this.removeCommentFromState(EDITING, comment)
                }}
                editing
                autoFocus
              />
            ) : (
              renderTextContent(comment)
            )}
          </div>
          {replying.has(comment.id) && !atMaxDepth && post ? (
            <div>
              <CommentForm
                post={post}
                comment={comment}
                closeReply={() => {
                  this.removeCommentFromState(REPLYING, comment)
                }}
                autoFocus
              />
            </div>
          ) : null}
          {this.renderCommentActions(comment, atMaxDepth)}
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

function CommentActions() {}
