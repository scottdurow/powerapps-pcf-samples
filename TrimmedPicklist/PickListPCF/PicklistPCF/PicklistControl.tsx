import * as React from "react";
import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";

export interface PicklistControlProps {
  value: number | undefined;
  readonly: boolean;
  showBlank?: boolean;
  masked: boolean;
  options: IDropdownOption[];
  onChange: (newValue: number | undefined) => void;
}

export class PicklistControl extends React.Component<PicklistControlProps> {
  constructor(props: PicklistControlProps) {
    super(props);
  }

  private _onChange = (event: React.FormEvent<HTMLDivElement>, item: IDropdownOption | undefined): void => {
    const selectedKey = item && (item.key as number);
    this.props.onChange(selectedKey);
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  render() {
    let options = this.props.options;
    if (this.props.showBlank) {
      options = [{ key: -1, text: "---" } as IDropdownOption].concat(this.props.options);
    }
    const selectedValue = this.props.value || -1;

    return this.props.masked ? (
      <strong> ******</strong>
    ) : (
      <Dropdown
        disabled={this.props.readonly}
        selectedKey={selectedValue}
        onChange={this._onChange}
        placeholder="---"
        options={options}
        styles={{ dropdown: { width: "100%" } }}
      />
    );
  }
}
