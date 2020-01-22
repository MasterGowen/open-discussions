// @flow
import ga from "react-ga"
import R from "ramda"

const remove = R.reject(R.isNil)

type GAEvent = {
  category: string,
  action: string,
  label: string,
  value?: number
}

export const sendGAEvent = (event: GAEvent
) => {
  ga.event(
    R.reject(R.isNil, event)
  )
}

export const GA_CAT_COURSE_SEARCH = "course_search"

export const GA_ACT_OPEN_DRAWER = "open_drawer"
export const GA_ACT_SHARE_LR = "share_lr"
