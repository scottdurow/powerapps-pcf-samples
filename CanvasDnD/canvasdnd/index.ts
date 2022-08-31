import * as dragula from 'dragula';
import { DatasetStateManager } from './DatasetStateManager';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { PCFPropertyBagStateManager } from './PropertyBagState';
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.PropertyTypes.DataSet;
const RECORD_ID_ATTRIBUTE = 'canvasdnd-item-id';

export class canvasdnd implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private contextObj: ComponentFramework.Context<IInputs>;
    private drake: dragula.Drake;
    private previousDropZoneId: string | null;
    private container: HTMLDivElement;
    private mainContainer: HTMLDivElement;
    private droppedId = '';
    private droppedTarget = '';
    private droppedSource = '';
    private droppedBeforeId = '';
    private listContainer: HTMLElement;
    private datasetStateManager = new DatasetStateManager(true);
    private propertyStateManager = new PCFPropertyBagStateManager(() => null, false);
    private propertiesTriggerRender = [
        'DropZoneID',
        'OtherDropZoneIDs',
        'IsMasterZone',
        'ItemBackgroundColour',
        'ItemFontSize',
        'ItemFontColour',
    ];

    notifyOutputChanged: () => void;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement,
    ): void {
        this.container = container;
        this.drake = dragula();
        this.drake.on('drop', this.onDrop);

        // Need to track container resize so that control could get the available width.
        // In Canvas-app, the available height will be provided in context.mode.allocatedHeight
        context.mode.trackContainerResize(true);
        this.notifyOutputChanged = notifyOutputChanged;
        context.parameters.items.paging.setPageSize(10000);

        // Create main table container div.
        this.mainContainer = document.createElement('div');
        this.mainContainer.classList.add('canvasdnd-main-container');
        container.appendChild(this.mainContainer);
    }

    onDrop = (el: Element, target: Element, source: Element, droppedBefore: Element): void => {
        if (this.container) {
            try {
                this.container.removeChild(el);
            } catch {
                //noop
            }
        }
        if (el) {
            const itemId = el.getAttribute(RECORD_ID_ATTRIBUTE);
            const containerId = target.id;
            this.droppedTarget = containerId;
            this.droppedSource = source.id;
            this.droppedId = itemId as string;
            this.droppedBeforeId = droppedBefore ? (droppedBefore.getAttribute(RECORD_ID_ATTRIBUTE) as string) : '';
            this.notifyOutputChanged();
        }
    };

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Determine what has changed
        const datasetChanged = this.datasetStateManager.setData(context.parameters.items);
        const propertiesChanged = this.propertyStateManager.getInboundChangedProperties(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            context.parameters as Record<string, any>,
            context.updatedProperties,
        );

        // If nothing has changed, then exit
        if (propertiesChanged.length > 0 || !datasetChanged.dataHasChanged) {
            return;
        }

        this.contextObj = context;

        // If we don't have a drop zone or the id has changed
        if (!this.listContainer || propertiesChanged.indexOf('DropZoneID') > -1) {
            if (this.listContainer) {
                // Remove old list container
                this.mainContainer.removeChild(this.listContainer);
            }
            this.previousDropZoneId = this.contextObj.parameters.DropZoneID.raw;
            this.listContainer = document.createElement('ul');
            this.listContainer.id = this.contextObj.parameters.DropZoneID.raw as string;
            this.listContainer.classList.add('canvasdnd-list');
            this.mainContainer.appendChild(this.listContainer);
        }

        // Set height
        this.listContainer.style.height = context.mode.allocatedHeight + 'px';
        const updateItems =
            datasetChanged.dataHasChanged ||
            propertiesChanged.filter((value) => this.propertiesTriggerRender.includes(value));

        if (!context.parameters.items.loading && updateItems) {
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
            const containers = context.parameters.OtherDropZoneIDs.raw?.split(',');
            const containerElements: HTMLElement[] = [this.listContainer];

            // Since the other containers may not be created yet, we setup drake after a timeout
            // To the app time to create the containers
            this.scheduleHooks(containers, containerElements);
        }
    }

    public getOutputs(): IOutputs {
        return {
            DroppedId: this.droppedId,
            DroppedTarget: this.droppedTarget,
            DroppedSource: this.droppedSource,
            DroppedBeforeId: this.droppedBeforeId,
        };
    }

    public destroy(): void {
        this.drake.destroy();
    }

    private scheduleHooks(containers: string[], containerElements: HTMLElement[]) {
        const hooksAdded = this.addDrakeHooks(containers, containerElements);
        if (!hooksAdded) {
            setTimeout(() => {
                this.scheduleHooks(containers, containerElements);
            }, 1000);
        }
    }

    private addDrakeHooks(containers: string[], containerElements: HTMLElement[]): boolean {
        for (const container of containers) {
            const containerElement = document.getElementById(container.trim()) as HTMLElement;
            // Is the drop zone found?
            if (!containerElement) return false;
            containerElements.push(containerElement);
        }
        this.drake.containers = containerElements;
        return true;
    }

    private getSortedFieldsOnDataset(context: ComponentFramework.Context<IInputs>): DataSetInterfaces.Column[] {
        if (!context.parameters.items.columns) {
            return [];
        }
        const columns = context.parameters.items.columns;
        return columns;
    }

    private addItemDOMElements(fieldsOnDataset: DataSetInterfaces.Column[], dataset: DataSet): void {
        if (dataset.sortedRecordIds.length > 0) {
            let index = 0;
            for (const currentRecordId of dataset.sortedRecordIds) {
                index++;
                const itemRow: HTMLElement = document.createElement('li');
                itemRow.classList.add('canvasdnd-item');

                // Style accordingly
                if (this.contextObj.parameters.ItemBackgroundColour.raw) {
                    itemRow.style.backgroundColor = this.contextObj.parameters.ItemBackgroundColour.raw;
                }
                if (this.contextObj.parameters.ItemFontSize.raw) {
                    itemRow.style.fontSize = this.contextObj.parameters.ItemFontSize.raw + 'px';
                }
                if (this.contextObj.parameters.ItemFontColour.raw) {
                    itemRow.style.color = this.contextObj.parameters.ItemFontColour.raw;
                }

                // Set the index of the item in the source dataset - this is used when we drop an item
                itemRow.setAttribute(
                    RECORD_ID_ATTRIBUTE,
                    this.getItemId(dataset.records[currentRecordId]) ?? index.toString(),
                );
                fieldsOnDataset.forEach(function (columnItem) {
                    const innerDiv = document.createElement('div');
                    innerDiv.classList.add('canvasdnd-item-value');
                    innerDiv.innerText = dataset.records[currentRecordId].getFormattedValue(columnItem.name);
                    itemRow.appendChild(innerDiv);
                });
                this.listContainer.appendChild(itemRow);
            }
        }
    }

    private getItemId(record: DataSetInterfaces.EntityRecord): string | undefined {
        // Provide a column to use to identify the items in the items collection.
        // This avoids the issue where when bound to a mutating local collection, the ids will not start at 1
        if (this.contextObj.parameters.ItemKeyName && this.contextObj.parameters.ItemKeyName.raw) {
            const idValue = record.getFormattedValue(this.contextObj.parameters.ItemKeyName.raw);
            if (idValue && idValue !== '') return idValue;
        }

        return undefined;
    }
}
