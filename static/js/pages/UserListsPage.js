// @flow
import React, { useState } from "react"
import { useRequest } from "redux-query-react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"

import { Cell, Grid } from "../components/Grid"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import UserListCard from "../components/UserListCard"
import UserListFormDialog from "../components/UserListFormDialog"
import LoginTooltip from "../components/LoginTooltip"

import { userListsRequest, userListsSelector } from "../lib/queries/user_lists"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
import { userIsAnonymous } from "../lib/util"

const userListsPageSelector = createSelector(
  userListsSelector,
  userLists =>
    userLists ? Object.keys(userLists).map(key => userLists[key]) : null
)

export default function UserListsPage() {
  const [showCreateListDialog, setShowCreateListDialog] = useState(false)
  const [{ isFinished }] = useRequest(userListsRequest())

  const userLists = useSelector(userListsPageSelector)

  return (
    <BannerPageWrapper>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer tall compactOnMobile>
          <BannerImage src={COURSE_SEARCH_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
      </BannerPageHeader>
      {showCreateListDialog ? (
        <UserListFormDialog hide={() => setShowCreateListDialog(false)} />
      ) : null}
      <Grid className="main-content one-column narrow user-list-page">
        <Cell width={12} className="first-row">
          <h1 className="my-lists">My Lists</h1>
          <LoginTooltip>
            <button
              className="blue-btn"
              onClick={e => {
                e.preventDefault()
                if (!userIsAnonymous()) {
                  setShowCreateListDialog(!showCreateListDialog)
                }
              }}
            >
              Create New List
            </button>
          </LoginTooltip>
        </Cell>
        {isFinished
          ? userLists.map((list, i) => (
            <Cell width={12} key={i}>
              <UserListCard userList={list} />
            </Cell>
          ))
          : null}
      </Grid>
    </BannerPageWrapper>
  )
}