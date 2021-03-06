// @flow
import React from "react"
import R from "ramda"
import { Radio } from "@mitodl/mdl-react-components"

import Dialog from "../Dialog"
import WidgetField from "./WidgetField"

import { validateWidgetDialog, validationMessage } from "../../lib/validation"

import type { WidgetDialogData, WidgetSpec } from "../../flow/widgetTypes"

type Props = {
  dialogOpen: boolean,
  dialogData: ?WidgetDialogData,
  setDialogData: (data: WidgetDialogData) => void,
  setDialogVisibility: (visible: boolean) => void,
  updateForm: (data: WidgetDialogData) => void,
  specs: Array<WidgetSpec>
}

const titleLens = R.lensPath(["title"])
const widgetTypeLens = R.lensPath(["widget_type"])
export const WIDGET_TYPE_SELECT = "WIDGET_TYPE_SELECT"
export const WIDGET_EDIT = "WIDGET_EDIT"
export const WIDGET_CREATE = "WIDGET_CREATE"

const onChangeWrapper = (valueFunction: Function) => (event: any) =>
  valueFunction(event.target.value)

export default class WidgetEditDialog extends React.Component<Props> {
  componentDidMount() {
    this.deBlur()
  }

  componentDidUpdate() {
    this.deBlur()
  }

  deBlur = () => {
    const { dialogData, dialogOpen } = this.props
    const node = document.querySelector(".widget-dialog button.submit")
    if (
      dialogOpen &&
      dialogData &&
      dialogData.state === WIDGET_TYPE_SELECT &&
      node
    ) {
      // deblur radio buttons by putting focus on submit button
      node.focus()
    }
  }

  updateValues = R.curry((lenses: Array<any>, values: Array<any>) => {
    const { setDialogData, dialogData } = this.props
    if (!dialogData) {
      return
    }

    let updated = dialogData.instance
    lenses.forEach((lens, index) => {
      const value = values[index]
      updated = R.set(lens, value, updated)
    })
    setDialogData({
      ...dialogData,
      instance: updated
    })
  })

  updateValue = R.curry((lens: any, value: any) => {
    this.updateValues([lens], [value])
  })

  getValue = (lens: any) => {
    const { dialogData } = this.props
    return (
      dialogData && dialogData.instance && R.view(lens, dialogData.instance)
    )
  }

  renderSelectWidgetType = () => {
    const { specs, dialogData } = this.props

    const validation = dialogData ? dialogData.validation : {}
    return (
      <React.Fragment>
        <Radio
          className="radio"
          value={this.getValue(widgetTypeLens)}
          onChange={onChangeWrapper(this.updateValue(widgetTypeLens))}
          options={specs.map(spec => ({
            label: spec.description,
            value: spec.widget_type
          }))}
        />
        {validationMessage(validation.widget_type)}
      </React.Fragment>
    )
  }

  renderWidgetInputs = () => {
    const { specs, dialogData } = this.props

    const validation = dialogData ? dialogData.validation : {}
    const spec = specs.filter(
      spec => spec.widget_type === this.getValue(widgetTypeLens)
    )[0]

    return (
      <React.Fragment>
        <label className="widget-title-field">
          Title
          <input
            type="text"
            value={this.getValue(titleLens) || ""}
            onChange={onChangeWrapper(this.updateValue(titleLens))}
          />
        </label>
        {validationMessage(validation.title)}
        {spec.form_spec.map(fieldSpec => {
          return (
            <label
              key={fieldSpec.field_name}
              className={`configuration-field ${fieldSpec.input_type}`}
            >
              {fieldSpec.label}
              <WidgetField
                getValue={this.getValue}
                updateValues={this.updateValues}
                fieldSpec={fieldSpec}
              />
              {validationMessage(
                R.view(
                  R.lensPath(["configuration", fieldSpec.field_name]),
                  validation
                )
              )}
              {fieldSpec.under_text ? (
                <div className="under-text">{fieldSpec.under_text}</div>
              ) : null}
            </label>
          )
        })}
      </React.Fragment>
    )
  }

  closeDialog = () => {
    const { setDialogVisibility } = this.props
    setDialogVisibility(false)
  }

  acceptDialog = () => {
    const { dialogData, setDialogData, updateForm } = this.props
    if (!dialogData) {
      // for flow
      return
    }

    const validation = validateWidgetDialog(dialogData)
    if (!R.isEmpty(validation)) {
      setDialogData({
        ...dialogData,
        validation
      })
      return
    }

    if (dialogData.state === WIDGET_TYPE_SELECT) {
      setDialogData({
        ...dialogData,
        state:      WIDGET_CREATE,
        validation: {}
      })
      return
    }

    updateForm(dialogData)
    this.closeDialog()
  }

  render() {
    const { dialogData, dialogOpen, specs } = this.props
    if (!dialogData) {
      return null
    }

    let title = "",
      submitText = ""

    if (dialogData.state === WIDGET_TYPE_SELECT) {
      title = "Select widget"
      submitText = "Next"
    } else if (dialogData.state === WIDGET_EDIT) {
      title = "Edit widget"
      submitText = "Update widget"
    } else if (dialogData.state === WIDGET_CREATE) {
      const spec = specs.find(
        spec => spec.widget_type === this.getValue(widgetTypeLens)
      )
      // $FlowFixMe: spec should always exist here
      title = `Add ${spec.description} widget`
      submitText = "Create widget"
    }

    return (
      <Dialog
        open={dialogOpen}
        hideDialog={this.closeDialog}
        onAccept={this.acceptDialog}
        title={title}
        submitText={submitText}
        className="widget-dialog"
      >
        {dialogData.state === WIDGET_TYPE_SELECT
          ? this.renderSelectWidgetType()
          : this.renderWidgetInputs()}
      </Dialog>
    )
  }
}
