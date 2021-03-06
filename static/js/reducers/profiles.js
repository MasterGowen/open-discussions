// @flow
import * as api from "../lib/api/api"
import { GET, PATCH, INITIAL_STATE } from "redux-hammock/constants"

import type { Profile, ProfilePayload } from "../flow/discussionTypes"

const updateProfileHandler = (
  payload: Profile,
  data: Map<string, Profile>
): Map<string, Profile> => {
  const update = new Map(data)
  update.set(payload.username, payload)
  return update
}

export const profilesEndpoint = {
  name:              "profiles",
  verbs:             [GET, PATCH],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           (username: string) => api.getProfile(username),
  getSuccessHandler: updateProfileHandler,
  patchFunc:         (username: string, payload: ProfilePayload) =>
    api.updateProfile(username, payload),
  patchSuccessHandler: updateProfileHandler
}
