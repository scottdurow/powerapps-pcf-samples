import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { ControlContextService, StandardControlReact } from "pcf-react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { CalculatorComponent } from "./components/calculator";
import { TaxCalculatorViewModel } from "./viewmodel/TaxCalculator";
import { initializeIcons } from "@fluentui/react/lib/Icons";
initializeIcons(undefined, { disableWarnings: true });
export class calculator extends StandardControlReact<IInputs, IOutputs> {
  constructor() {
    super();
    this.initServiceProvider = (serviceProvider): void => {
      serviceProvider.register(
        "TaxCalculatorViewModel",
        new TaxCalculatorViewModel(serviceProvider.get(ControlContextService.serviceProviderName)),
      );
    };
    this.reactCreateElement = (container, width, height, serviceProvider): void => {
      ReactDOM.render(React.createElement(CalculatorComponent, { serviceProvider: serviceProvider }), container);
    };
  }
}
