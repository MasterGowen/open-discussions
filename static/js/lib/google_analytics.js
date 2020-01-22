// @flow
import ga from "react-ga"
import R from "ramda"

const remove = R.reject(R.isNil)

export const sendGAEvent = (
  category: string,
  action: string,
  label: string,
  value?: number
) => {
  ga.event(
    R.reject(R.isNil, { category, action, label, value })
  )
}
