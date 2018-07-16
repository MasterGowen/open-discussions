// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { Link } from "react-router-dom"
import { FETCH_SUCCESS } from "redux-hammock/constants"

import Card from "../components/Card"
import PasswordChangeForm from "../components/PasswordChangeForm"
import withForm from "../hoc/withForm"

import { actions } from "../actions"
import { formatTitle } from "../lib/title"
import { mergeAndInjectProps } from "../lib/redux_props"
import { configureForm } from "../lib/forms"
import { ACCOUNT_SETTINGS_URL } from "../lib/url"
import { validatePasswordChangeForm as validateForm } from "../lib/validation"

import type { PwChangeForm } from "../flow/authTypes"

export class PasswordChangePage extends React.Component<*, void> {
  componentWillUnmount() {
    const { clearPasswordChange, successfullySubmitted } = this.props
    // If the form has been successfully submitted and we are navigating away
    // from this page, clear the password change request state so that the user
    // will see the password change form (instead of the success message) the
    // next time they visit this page.
    if (successfullySubmitted) {
      clearPasswordChange()
    }
  }

  render() {
    const { renderForm, successfullySubmitted, invalidPwError } = this.props
    return (
      <div className="content">
        <MetaTags>
          <title>{formatTitle("Change Password")}</title>
        </MetaTags>
        <div className="main-content settings-page">
          <h4>Change Password</h4>
          {successfullySubmitted ? (
            <Card>
              <h3>Your password has been changed successfully!</h3>
              <Link to={ACCOUNT_SETTINGS_URL} className="buttonLink">
                Back to Settings
              </Link>
            </Card>
          ) : (
            <Card>{renderForm({ invalidPwError })}</Card>
          )}
        </div>
      </div>
    )
  }
}

const passwordChangeForm = () => ({
  current_password: "",
  new_password:     ""
})

export const FORM_KEY = "settings:password_change"
const { getForm, actionCreators } = configureForm(FORM_KEY, passwordChangeForm)

const onSubmit = (form: PwChangeForm) =>
  actions.passwordChange.post(form.current_password, form.new_password)

const clearPasswordChange = () => actions.passwordChange.clear()

const mergeProps = mergeAndInjectProps((stateProps, { onSubmit }) => ({
  onSubmit: form => onSubmit(form)
}))

const mapStateToProps = state => {
  const form = getForm(state)
  const passwordChange = state.passwordChange
  const invalidPwError = R.view(R.lensPath(["error", "current_password"]))(
    passwordChange
  )
  const successfullySubmitted =
    passwordChange &&
    passwordChange.loaded &&
    !passwordChange.processing &&
    passwordChange.postStatus === FETCH_SUCCESS

  return {
    form,
    validateForm,
    invalidPwError,
    successfullySubmitted
  }
}

export default R.compose(
  connect(
    mapStateToProps,
    {
      clearPasswordChange,
      onSubmit,
      ...actionCreators
    },
    mergeProps
  ),
  withForm(PasswordChangeForm)
)(PasswordChangePage)
