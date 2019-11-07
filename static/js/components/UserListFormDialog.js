// @flow
import React from "react"
import { useMutation } from "redux-query-react"
import { Formik, Form, Field } from "formik"

import Dialog from "./Dialog"

import {
  createUserListMutation,
  userListMutation
} from "../lib/queries/user_lists"
import {
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_PUBLIC,
  LR_PRIVATE
} from "../lib/constants"
import {
  validateCreateUserListForm,
  validationMessage
} from "../lib/validation"

import type { UserList } from "../flow/discussionTypes"

type Props = {
  hide: Function,
  userList?: UserList
}

export default function UserListFormDialog(props: Props) {
  // if a userList is provided we're editing it,
  // if not we're creating a new userList
  const { hide, userList } = props

  const [, createUserList] = useMutation(createUserListMutation)
  const [, updateUserList] = useMutation(userListMutation)

  return (
    <Formik
      onSubmit={async params => {
        if (userList) {
          await updateUserList({
            ...params,
            id: userList.id
          })
        } else {
          await createUserList(params)
        }
        hide()
      }}
      initialValues={
        userList
          ? {
            title:             userList.title,
            short_description: userList.short_description,
            privacy_level:     userList.privacy_level,
            list_type:         userList.list_type
          }
          : {
            title:             "",
            short_description: ""
          }
      }
      validate={validateCreateUserListForm}
      validateOnBlur={false}
      validateOnChange={false}
    >
      {({ handleSubmit, errors }) => (
        <Dialog
          title={userList ? `Edit ${userList.title}` : "Create new list"}
          open={true}
          hideDialog={hide}
          onAccept={handleSubmit}
          className="create-user-list-dialog"
          submitText="Save"
        >
          <Form className="user-list-create-form">
            <span className="input-name">List Type</span>
            <div className="type radio">
              <Field
                name="list_type"
                id="type-list"
                type="radio"
                value={LR_TYPE_USERLIST}
              />
              <label htmlFor="type-list">
                <span className="header">Custom List</span>
                Create a custom list of any of our learning resources
              </label>
              <Field
                name="list_type"
                type="radio"
                id="type-lp"
                value={LR_TYPE_LEARNINGPATH}
              />
              <label htmlFor="type-lp">
                <span className="header">Learning Path</span>
                An ordered list of learning resources
              </label>
            </div>
            {validationMessage(errors.list_type)}
            <span className="input-name">Privacy</span>
            <div className="privacy radio">
              <Field
                name="privacy_level"
                id="radio-public"
                type="radio"
                value={LR_PUBLIC}
              />
              <label htmlFor="radio-public">
                <span className="header">Public</span>
              </label>
              <Field
                name="privacy_level"
                type="radio"
                id="radio-private"
                value={LR_PRIVATE}
              />
              <label htmlFor="radio-private">
                <span className="header">Private</span>
              </label>
            </div>
            {validationMessage(errors.privacy_level)}
            <span className="input-name">List Title</span>
            <Field name="title" className="title" />
            {validationMessage(errors.title)}
            <span className="input-name">Description</span>
            <Field name="short_description" as="textarea" />
            {validationMessage(errors.short_description)}
          </Form>
        </Dialog>
      )}
    </Formik>
  )
}