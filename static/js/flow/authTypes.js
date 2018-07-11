// @flow

// Form types

export type EmailForm = {
  email: string
}

export type PasswordForm = {
  password: string
}

export type DetailsForm = {
  name: string
} & PasswordForm

export type ResetConfirmForm = {
  new_password: string,
  re_new_password: string
}

// API response types
export type AuthStates =
  |"success"
  | "inactive"
  | "error"
  | "login/email"
  | "login/password"
  | "register/email"
  | "register/confirm-sent"
  | "register/confirm"
  | "register/details"

export type AuthFlow = "register" | "login"

export type AuthResponse = {
  partial_token: ?string,
  flow:          AuthFlow,
  state:         AuthStates,
  errors:        Array<string>,
  email?:        string
}