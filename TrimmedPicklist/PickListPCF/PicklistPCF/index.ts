/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { PicklistControl } from "./PicklistControl";
import { IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";
import { initializeIcons } from "@uifabric/icons";

initializeIcons(undefined, { disableWarnings: true });

const picklistFieldName = "picklistField";

export class PicklistPCF implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  _container: HTMLDivElement;
  _context: ComponentFramework.Context<IInputs>;
  _notifyOutputChanged: () => void;
  _selectedValue: number | undefined;

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement,
  ) {
    this._container = container;
    this._context = context;
    this._notifyOutputChanged = notifyOutputChanged;
    this._selectedValue = this.getRawValue(context);
    this.renderControl(context);
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    if (context.updatedProperties.includes(picklistFieldName)) {
      this._selectedValue = this.getRawValue(context);
      // Add code to update control view
      this.renderControl(context);
    }
  }
  private getRawValue(context: ComponentFramework.Context<IInputs>) {
    const rawValue = context.parameters.picklistField.raw;
    return rawValue == null ? undefined : rawValue;
  }
  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
   */
  public getOutputs(): IOutputs {
    return {
      picklistField: this._selectedValue as number | undefined,
    };
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Add code to cleanup control if necessary
    ReactDOM.unmountComponentAtNode(this._container);
  }

  onChange = (newValue: number | undefined) => {
    this._selectedValue = newValue;
    this._notifyOutputChanged();
  };

  private renderControl(context: ComponentFramework.Context<IInputs>) {
    // Get options metadata
    const metadata = context.parameters.picklistField.attributes;
    if (metadata && context.parameters.filtering.raw) {
      // Get the configuration input parameter - comma separated list of optionset values
      const filterInput = context.parameters.filtering.raw.split(",").map(a => {
        return parseInt(a);
      });

      // Create filtered options provided by the metadata
      // Do this with every render in case they change
      const options = metadata.Options.filter(o => filterInput.includes(o.Value)).map(v => {
        return {
          key: v.Value,
          text: v.Label,
        } as IDropdownOption;
      });

      // If the form is diabled because it is inactive or the user doesn't have access
      // isControlDisabled is set to true
      let readOnly = this._context.mode.isControlDisabled;
      // When a field has FLS enabled, the security property on the attribute parameter is set
      let masked = false;
      if (this._context.parameters.picklistField.security) {
        readOnly = readOnly || !this._context.parameters.picklistField.security.editable;
        masked = !this._context.parameters.picklistField.security.readable;
      }
      const requiredLevel = this._context.parameters.picklistField.attribute?.RequiredLevel;
      const isRequired = requiredLevel == 1 || requiredLevel == 2; // System or Application Required
      ReactDOM.render(
        React.createElement(PicklistControl, {
          value: this._selectedValue,
          options: options,
          readonly: readOnly,
          masked: masked,
          showBlank: !isRequired,
          onChange: this.onChange,
        }),
        this._container,
      );
    }
  }
}
