/* eslint-disable @typescript-eslint/no-unused-vars */
export class DatasetStateManager {
    public currentPage = 1;
    private dataset?: ComponentFramework.PropertyTypes.DataSet;
    private pageSize = 0;
    private pendingData = false;
    private previousSortedIds: string[];
    private previousRecords: { [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord } = {};
    private isCanvas = false;
    constructor(isCanvasApps: boolean) {
        this.isCanvas = isCanvasApps;
    }
    reset(): void {
        this.currentPage = 1;
        this.dataset?.paging.reset();
    }
    refresh(): void {
        this.currentPage = 1;
        this.dataset?.refresh();
        this.pendingData = true;
    }
    getTotalRecords(): number | undefined {
        return this.dataset?.paging.totalResultCount;
    }
    getPageNumber(): number {
        return this.currentPage;
    }
    getPageSize(): number {
        return this.pageSize;
    }
    getTotalPages(): number {
        const totalRecords = this.getTotalRecords();
        return totalRecords ? Math.ceil(totalRecords / this.pageSize) : 1;
    }
    hasNextPage(): boolean {
        if (this.dataset) {
            return this.dataset.paging.hasNextPage;
        } else {
            return false;
        }
    }
    hasPreviousPage(): boolean {
        if (this.dataset) {
            return this.dataset.paging.hasPreviousPage;
        } else {
            return false;
        }
    }
    setPage(pageNumber: number): void {
        if (this.pendingData) return;
        if (pageNumber > 0 && pageNumber <= this.getTotalPages()) {
            this.currentPage = pageNumber;
            if (this.dataset) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.loadPage(pageNumber);
            }
        }
    }
    nextPage(): boolean {
        if (this.pendingData) return false;
        if (this.hasNextPage()) {
            this.currentPage++;
            this.loadPage(this.currentPage);
        }
        return true;
    }
    nextPageIncremental(): boolean {
        if (this.pendingData) return false;
        if (this.hasNextPage()) {
            this.currentPage++;
            this.dataset?.paging.loadNextPage();
        }
        return true;
    }
    loadPage(index: number): boolean {
        if (this.pendingData) return false;
        this.pendingData = true;
        this.currentPage = index;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagingAny = this.dataset?.paging as any;
        pagingAny.loadExactPage(index);
        return true;
    }
    previousPage(): boolean {
        if (this.pendingData) return false;
        if (this.hasPreviousPage()) {
            this.currentPage--;
            this.loadPage(this.currentPage);
        }
        return true;
    }
    setPageSize(pageSize: number): void {
        this.pageSize = pageSize;
        this.dataset?.paging.setPageSize(pageSize);
        this.loadPage(1);
    }
    applySort(sort: ComponentFramework.PropertyHelper.DataSetApi.SortStatus[], refresh?: boolean): boolean {
        if (this.pendingData) {
            return false;
        }
        if (!this.dataset) throw new Error('dataset is not loaded');
        while (this.dataset.sorting.length > 0) {
            this.dataset.sorting.pop();
        }
        this.dataset.sorting.push(...sort);
        if (refresh) {
            this.refresh();
        }
        return true;
    }
    setData(dataset: ComponentFramework.PropertyTypes.DataSet): { dataHasChanged: boolean } {
        this.pendingData = false;
        this.dataset = dataset;
        let changed = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.pageSize = (dataset.paging as any).pageSize;

        if (this.currentPage > 1 && !dataset.paging.hasPreviousPage) {
            this.currentPage = 1;
            changed = true;
        } else if (this.currentPage === 1 && dataset.paging.hasPreviousPage) {
            // We are starting in the middle of the pages (can happen on mobile and Canvas)
            // Move to the first page
            this.setPage(1);
            changed = true;
        } else {
            // Check the rows of the dataset to see if it's changed
            if (!this.previousSortedIds) {
                changed = true;
            } else if (dataset.sortedRecordIds.length !== this.previousSortedIds.length) {
                changed = true;
            } else if (Object.keys(dataset.records).length !== Object.keys(this.previousRecords).length) {
                changed = true;

                if (!changed) {
                    // Check if the sorted records have changed
                    for (let i = 0; i <= dataset.sortedRecordIds.length; i++) {
                        if (dataset.sortedRecordIds[i] !== this.previousSortedIds[i]) {
                            changed = true;
                            break;
                        }
                    }
                }
                if (!changed && this.isCanvas) {
                    // Check if the actual records have changed using the comparison column
                    // We have to do this for Canvas Apps where it might be bound to a collection that doesn't have unique Ids
                    for (const key in this.previousRecords) {
                        const newRecord = dataset.records[key];
                        const previousRecord = this.previousRecords[key];
                        if (!newRecord || previousRecord !== newRecord) {
                            changed = true;
                            break;
                        }
                    }
                }
            }

            if (changed) {
                this.previousRecords = {};
                Object.assign(this.previousRecords, dataset.records);
                this.previousSortedIds = [...dataset.sortedRecordIds]; // Clone the sortedRecordIds for comparisons
            }
        }
        const dataHasChanged = {
            dataHasChanged: changed,
        };

        return dataHasChanged;
    }
}
