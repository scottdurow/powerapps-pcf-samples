import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
import * as dragula from "dragula";
type DataSet = ComponentFramework.PropertyTypes.DataSet;
const RECORD_ID_ATTRIBUTE = "canvasdnd-item-id";

export class canvasdnd implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private contextObj: ComponentFramework.Context<IInputs>;
  private drake: dragula.Drake;
  private previousDropZoneId: string | null;
  private container: HTMLDivElement;
  private mainContainer: HTMLDivElement;
  private droppedId = "";
  private droppedTarget = "";
  private droppedSource = "";
  private droppedBeforeId = "";
  private listContainer: HTMLElement;
  notifyOutputChanged: () => void;
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
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement,
  ): void {
    this.container = container;
    this.drake = dragula();
    this.drake.on("drop", this.onDrop);

    // Need to track container resize so that control could get the available width.
    // In Canvas-app, the available height will be provided in context.mode.allocatedHeight
    context.mode.trackContainerResize(true);
    this.notifyOutputChanged = notifyOutputChanged;
    context.parameters.items.paging.setPageSize(10000);

    // Create main table container div.
    this.mainContainer = document.createElement("div");
    this.mainContainer.classList.add("canvasdnd-main-container");
    container.appendChild(this.mainContainer);
  }

  onDrop = (el: Element, target: Element, source: Element, droppedBefore: Element): void => {
    if (this.container) {
      try {
        this.container.removeChild(el);
      } catch {}
    }
    if (el) {
      const itemId = el.getAttribute(RECORD_ID_ATTRIBUTE);
      const containerId = target.id;
      this.droppedTarget = containerId;
      this.droppedSource = source.id;
      this.droppedId = itemId as string;
      this.droppedBeforeId = droppedBefore ? (droppedBefore.getAttribute(RECORD_ID_ATTRIBUTE) as string) : "";
      this.notifyOutputChanged();
    }
  };

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.contextObj = context;

    // If we don't have a drop zone or the id has changed
    if (!this.listContainer || this.previousDropZoneId != this.contextObj.parameters.DropZoneID.raw) {
      this.previousDropZoneId = this.contextObj.parameters.DropZoneID.raw;
      this.listContainer = document.createElement("ul");
      this.listContainer.id = this.contextObj.parameters.DropZoneID.raw as string;
      this.listContainer.classList.add("canvasdnd-list");
      this.mainContainer.appendChild(this.listContainer);
    }

    // Set height
    this.listContainer.style.height = context.mode.allocatedHeight + "px";

    if (!context.parameters.items.loading) {
      // Get sorted columns on collection provided as the dataset
      const fieldsOnDataset = this.getSortedFieldsOnDataset(context);
      if (!fieldsOnDataset || fieldsOnDataset.length === 0) {
        return;
      }

      // Remove existing items
      while (this.listContainer.firstChild && this.listContainer.firstChild.parentNode) {
        this.listContainer.firstChild.parentNode.removeChild(this.listContainer.firstChild);
      }
      this.addItemDOMElements(fieldsOnDataset, context.parameters.items);
    }

    if (context.parameters.IsMasterZone.raw && context.parameters.OtherDropZoneIDs.raw) {
      // Get the other containers - we need to do this each update as the other drop zones may not have been build the last time
      const containers = context.parameters.OtherDropZoneIDs.raw?.split(",");
      const containerElements: HTMLElement[] = [this.listContainer];
      for (const container of containers) {
        const containerElement = document.getElementById(container.trim()) as HTMLElement;
        containerElements.push(containerElement);
      }
      this.drake.containers = containerElements;
    }
  }
  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as â€œboundâ€ or â€œoutputâ€
   */
  public getOutputs(): IOutputs {
    return {
      DroppedId: this.droppedId,
      DroppedTarget: this.droppedTarget,
      DroppedSource: this.droppedSource,
      DroppedBeforeId: this.droppedBeforeId,
    };
  }
  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    this.drake.destroy();
  }

  /**
   * Get sorted columns on view, columns are sorted by DataSetInterfaces.Column.order
   * Property-set columns will always have order = -1.
   * In Model-driven app, the columns are ordered in the same way as columns defined in views.
   * In Canvas-app, the columns are ordered by the sequence fields added to control
   * Note that property set columns will have order = 0 in test harness, this is a bug.
   * @param context
   * @return sorted columns object on View
   */
  private getSortedFieldsOnDataset(context: ComponentFramework.Context<IInputs>): DataSetInterfaces.Column[] {
    if (!context.parameters.items.columns) {
      return [];
    }
    const columns = context.parameters.items.columns;
    return columns;
  }

  private addItemDOMElements(fieldsOnDataset: DataSetInterfaces.Column[], dataset: DataSet): void {
    if (dataset.sortedRecordIds.length > 0) {
      for (const currentRecordId of dataset.sortedRecordIds) {
        const itemRow: HTMLElement = document.createElement("li");
        itemRow.classList.add("canvasdnd-item");

        // Style accordingly
        if (this.contextObj.parameters.ItemBackgroundColour.raw) {
          itemRow.style.backgroundColor = this.contextObj.parameters.ItemBackgroundColour.raw;
        }
        if (this.contextObj.parameters.ItemFontSize.raw) {
          itemRow.style.fontSize = this.contextObj.parameters.ItemFontSize.raw + "px";
        }
        if (this.contextObj.parameters.ItemFontColour.raw) {
          itemRow.style.color = this.contextObj.parameters.ItemFontColour.raw;
        }

        // Set the index of the item in the source dataset - this is used when we drop an item
        itemRow.setAttribute(RECORD_ID_ATTRIBUTE, dataset.records[currentRecordId].getRecordId());
        fieldsOnDataset.forEach(function (columnItem) {
          const innerDiv = document.createElement("div");
          innerDiv.classList.add("canvasdnd-item-value");
          innerDiv.innerText = dataset.records[currentRecordId].getFormattedValue(columnItem.name);
          itemRow.appendChild(innerDiv);
        });
        this.listContainer.appendChild(itemRow);
      }
    }
  }
}
