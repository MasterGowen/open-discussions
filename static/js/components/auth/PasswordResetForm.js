// @flow
import React from "react"

import { validationMessage } from "../../lib/validation"
import type { FormProps } from "../../flow/formTypes"
import type { EmailForm } from "../../flow/authTypes"

type PasswordResetFormProps = {
  emailApiError: ?string
} & FormProps<EmailForm>

export default class PasswordResetForm extends React.Component<*, void> {
  props: PasswordResetFormProps

  render() {
    const {
      form,
      validation,
      emailApiError,
      onSubmit,
      onUpdate,
      processing
    } = this.props

    return (
      <form onSubmit={onSubmit} className="form">
        <div className="emailfield row">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onUpdate}
          />
          {validationMessage(validation.email)}
          {validationMessage(emailApiError)}
        </div>
        <div className="actions row">
          <button
            type="submit"
            className={`submit-password-reset ${processing ? "disabled" : ""}`}
            disabled={processing}
          >
            Reset Password
          </button>
        </div>
      </form>
    )
  }
}