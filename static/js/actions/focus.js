// @flow
import { createAction } from "redux-actions"

export const SET_FOCUSED_COMMENT = "SET_FOCUSED_COMMENT"
export const setFocusedComment = createAction(SET_FOCUSED_COMMENT)

export const CLEAR_FOCUSED_COMMENT = "CLEAR_FOCUSED_COMMENT"
export const clearFocusedComment = createAction(CLEAR_FOCUSED_COMMENT)