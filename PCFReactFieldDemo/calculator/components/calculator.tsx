import { TextField } from "@fluentui/react/lib/TextField";
import { Label } from "@fluentui/react/lib/Label";
import * as React from "react";
import { Stack } from "@fluentui/react/lib/Stack";
import { ServiceProvider } from "pcf-react";
import { TaxCalculatorViewModel } from "../viewmodel/TaxCalculator";
import { observer } from "mobx-react";
import { IconButton } from "@fluentui/react/lib/Button";

export interface CalculatorComponentProps {
  serviceProvider: ServiceProvider;
}
export class CalculatorComponent extends React.Component<CalculatorComponentProps> {
  render(): JSX.Element {
    const vm = this.props.serviceProvider.get("TaxCalculatorViewModel") as TaxCalculatorViewModel;
    const { calculateMode, amount, tax, valueAfterTax } = vm;
    return (
      <Stack horizontal>
        {calculateMode && (
          <>
            <TextField label="Amount" type="number" value={amount.toString()} onChange={vm.onChangeAmount} />
            <TextField label="Tax %" type="number" value={tax.toString()} onChange={vm.onChangeTax} />
            <TextField
              label="Amount After Tax"
              value={valueAfterTax.toString()}
              type="number"
              onChange={vm.onChangeValueAfterTax}
            />
            <IconButton iconProps={{ iconName: "Accept" }} onClick={vm.onAccept} />
            <IconButton iconProps={{ iconName: "Cancel" }} onClick={vm.onCancel} />
          </>
        )}
        {!calculateMode && (
          <>
            <Label>{valueAfterTax}</Label>
            <IconButton iconProps={{ iconName: "Calculator" }} onClick={vm.onCalculate} />
          </>
        )}
      </Stack>
    );
  }
}

observer(CalculatorComponent);
