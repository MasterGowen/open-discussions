//@flow
import R from "ramda"

import type {
  Channel,
  ChannelForm,
  AddMemberForm
} from "../flow/discussionTypes"

export const CHANNEL_TYPE_PUBLIC: "public" = "public"
export const CHANNEL_TYPE_RESTRICTED: "restricted" = "restricted"
export const CHANNEL_TYPE_PRIVATE: "private" = "private"

export type ChannelType =
  | typeof CHANNEL_TYPE_PUBLIC
  | typeof CHANNEL_TYPE_RESTRICTED
  | typeof CHANNEL_TYPE_PRIVATE

export const LINK_TYPE_TEXT: "self" = "self"
export const LINK_TYPE_LINK: "link" = "link"
export const LINK_TYPE_ARTICLE: "article" = "article"

export const VALID_LINK_TYPES = [
  LINK_TYPE_TEXT,
  LINK_TYPE_ARTICLE,
  LINK_TYPE_LINK
]

export type LinkType =
  | typeof LINK_TYPE_TEXT
  | typeof LINK_TYPE_LINK
  | typeof LINK_TYPE_ARTICLE

export const MISSING_TEXT = "<missing>"

export const newChannelForm = (): ChannelForm => ({
  name:                  "",
  title:                 "",
  description:           "",
  public_description:    "",
  channel_type:          CHANNEL_TYPE_PUBLIC,
  allowed_post_types:    [LINK_TYPE_TEXT, LINK_TYPE_LINK],
  membership_is_managed: false
})

export const editChannelForm = (channel: Channel): ChannelForm =>
  R.pickAll(
    [
      "name",
      "title",
      "description",
      "public_description",
      "channel_type",
      "allowed_post_types"
    ],
    channel
  )

export const newMemberForm = (): AddMemberForm => ({
  email: ""
})

export const userCanPost = (channel: Channel) =>
  channel.channel_type === CHANNEL_TYPE_PUBLIC ||
  channel.user_is_moderator ||
  channel.user_is_contributor

export const updatePostTypes = (
  allowedPostTypes: Array<LinkType>,
  value: LinkType,
  checked: boolean
): Array<LinkType> => {
  if (checked) {
    return R.append(value, allowedPostTypes)
  }
  return R.without([value], allowedPostTypes)
}

export const isLinkTypeAllowed = (channel: ?Channel, linkType: string) =>
  !channel ? true : R.contains(linkType, channel.allowed_post_types)

export const isPrivate = (channel: Channel) =>
  channel.channel_type === CHANNEL_TYPE_PRIVATE
