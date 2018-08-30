// @flow
import React from "react"

type BackButtonProps = {
  onClick: Function,
  className?: string
}

const BackButton = ({ onClick, className }: BackButtonProps) => (
  // TODO: preventDefault
  <a href="#" onClick={onClick} className={`material-icons ${className || ""}`}>
    keyboard_backspace
  </a>
)

export default BackButton
