// @flow
/* global SETTINGS: false */
import React, { useState, useCallback } from "react"
import R from "ramda"
import moment from "moment"
import { Link } from "react-router-dom"
import { useDispatch } from "react-redux"

import Dialog from "./Dialog"
import ReportCount from "./ReportCount"
import Card from "./Card"
import CommentForm from "../components/CommentForm"
import CommentVoteForm from "./CommentVoteForm"
import CommentRemovalForm from "./CommentRemovalForm"
import ProfileImage, { PROFILE_IMAGE_MICRO } from "./ProfileImage"
import DropdownMenu from "../components/DropdownMenu"
import ReplyButton from "./ReplyButton"
import ShareTooltip from "./ShareTooltip"
import { renderTextContent } from "./Markdown"

import { preventDefaultAndInvoke, userIsAnonymous } from "../lib/util"
import { makeProfile } from "../lib/profile"
import { profileURL, absolutizeURL } from "../lib/url"
import { toggleFollowComment } from "../util/api_actions"
import { useCommentVoting, useCommentModeration } from "../hooks/comments"

// import type {
//   CommentInTree,
//   MoreCommentsInTree,
//   Post
// } from "../flow/discussionTypes"

export default function Comment(props) {
  const {
    commentPermalink,
    post,
    comment,
    isPrivateChannel,
    isModerator,
    reportComment,
    moderationUI,
    useSearchPageUI,
    atMaxDepth,
    children,
    shouldGetReports,
    channelName
  } = props

  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [commentMenuOpen, setCommentMenuOpen] = useState(false)

  const dispatch = useDispatch()
  const toggleFollowCommentCB = useCallback(toggleFollowComment(dispatch), [
    dispatch
  ])

  const {
    commentRemoveDialogOpen,
    setCommentRemoveDialogOpen,
    commentDeleteDialogOpen,
    setCommentDeleteDialogOpen,
    ignoreReports,
    removeComment,
    approveComment,
    deleteComment
  } = useCommentModeration(shouldGetReports, channelName)

  const [upvote, downvote] = useCommentVoting()

  return (
    <div className={`comment ${comment.removed ? "removed" : ""}`}>
      {commentRemoveDialogOpen ? (
        <Dialog
          id="remove-comment-dialog"
          open={commentRemoveDialogOpen}
          onAccept={() => removeComment(comment)}
          hideDialog={() => setCommentRemoveDialogOpen(false)}
          submitText="Yes, remove"
          title="Remove Comment"
        >
          <p>
            Are you sure? You will still be able to see the comment, but it will
            be deleted for normal users. You can undo this later by clicking
            "approve".
          </p>
        </Dialog>
      ) : null}
      {commentDeleteDialogOpen ? (
        <Dialog
          open={commentDeleteDialogVisible}
          hideDialog={this.hideCommentDialog(DELETE_COMMENT_DIALOG)}
          onAccept={async () => {
            await this.deleteComment()
            this.hideCommentDialog(DELETE_COMMENT_DIALOG)()
          }}
          title="Delete Comment"
          submitText="Yes, Delete"
        >
          Are you sure you want to delete this comment?
        </Dialog>
      ) : null}
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
                    setReplying(true)
                  }}
                />
              )}
            {useSearchPageUI ? null : (
              <ShareTooltip
                url={absolutizeURL(commentPermalink(comment.id))}
                hideSocialButtons={isPrivateChannel}
              >
                <div className="share-button-wrapper">
                  <div
                    className="comment-action-button share-button"
                    onClick={() => setCommentShareOpen(true)}
                  >
                    share
                  </div>
                </div>
              </ShareTooltip>
            )}
            {!userIsAnonymous() && !useSearchPageUI ? (
              <div>
                <i
                  className="material-icons more_vert"
                  onClick={() => setCommentMenuOpen(true)}
                >
                  more_vert
                </i>
                {commentMenuOpen ? (
                  <DropdownMenu
                    closeMenu={() => setCommentMenuOpen(false)}
                    className="post-comment-dropdown"
                  >
                    {userIsAnonymous() ? null : (
                      <li>
                        <div
                          className={`comment-action-button subscribe-comment ${
                            comment.subscribed ? "subscribed" : "unsubscribed"
                          }`}
                          onClick={preventDefaultAndInvoke(() => {
                            toggleFollowCommentCB(comment)
                          })}
                        >
                          <a href="#">
                            {comment.subscribed ? "Unfollow" : "Follow"}
                          </a>
                        </div>
                      </li>
                    )}
                    {SETTINGS.username === comment.author_id &&
                    !moderationUI ? (
                        <li>
                          <div
                            className="comment-action-button edit-button"
                            onClick={e => {
                              e.preventDefault()
                              setEditing(true)
                            }}
                          >
                            <a href="#">Edit</a>
                          </div>
                        </li>
                      ) : null}
                    {SETTINGS.username === comment.author_id &&
                    deleteComment ? (
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
                    {comment.num_reports && ignoreReports ? (
                      <li>
                        <div
                          className="comment-action-button ignore-button"
                          onClick={preventDefaultAndInvoke(() =>
                            ignoreReports(comment)
                          )}
                        >
                          <a href="#">Ignore reports</a>
                        </div>
                      </li>
                    ) : null}
                    <li>
                      <CommentRemovalForm
                        comment={comment}
                        remove={() => setCommentRemoveDialogOpen(true)}
                        approve={approveComment}
                        isModerator={isModerator}
                      />
                    </li>
                    {moderationUI ||
                    userIsAnonymous() ||
                    !reportComment ? null : (
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
        </div>
      </Card>
      {children}
    </div>
  )
}

const mapStateToProps = (state, ownProps) => {
  const { posts, channels, comments, forms, ui, embedly } = state
  const postID = getPostID(ownProps)
  const { channelName } = ownProps
  const commentID = getCommentID(ownProps)
  const post = posts.data.get(postID)
  const channel = channels.data.get(channelName)
  const commentsTree = comments.data.get(postID)
  const embedlyResponse =
    post && post.url ? embedly.data.get(post.url) : undefined

  const notFound = any404Error([posts, comments, channels])
  const notAuthorized = anyNotAuthorizedErrorType([posts, comments])

  const loaded = notFound
    ? true
    : R.none(R.isNil, [post, channel, commentsTree])

  const postDropdownMenuOpen = post
    ? ui.dropdownMenus.has(getPostDropdownMenuKey(post))
    : false

  const { dropdownMenus } = ui

  const postShareMenuOpen = ui.dropdownMenus.has(POST_SHARE_MENU_KEY)

  return {
    ...postModerationSelector(state, ownProps),
    ...commentModerationSelector(state, ownProps),
    postID,
    channelName,
    commentID,
    forms,
    post,
    channel,
    commentsTree,
    loaded,
    notFound,
    notAuthorized,
    postDropdownMenuOpen,
    postShareMenuOpen,
    dropdownMenus,
    profile:     getOwnProfile(state),
    isModerator: channel && channel.user_is_moderator,
    errored:
      anyErrorExcept404([posts, channels]) ||
      anyErrorExcept404or410([comments]),
    subscribedChannels: getSubscribedChannels(state),
    commentInFlight:    comments.processing,
    embedly:            embedlyResponse
  }
}
