<!-- src/lib/components/custom-ui/literature/LiteratureTable.svelte -->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { createGrid, ModuleRegistry } from "@ag-grid-community/core";
  import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
  import "@ag-grid-community/styles/ag-grid.css";
  import "@ag-grid-community/styles/ag-theme-quartz.css";
  import type { Literature } from "$lib/types/literature";
  import type {
    ValueFormatterParams,
    RowDoubleClickedEvent,
    GridApi,
    GridOptions,
    ColDef,
  } from "@ag-grid-community/core";

  // Register required modules
  ModuleRegistry.registerModules([ClientSideRowModelModule]);

  const props = $props<{ data: Literature[] }>();
  const dispatch = createEventDispatcher<{
    literatureSelect: Literature;
    gridReady: { api: GridApi<Literature> };
  }>();

  let gridDiv: HTMLElement;
  let gridApi: GridApi<Literature>;

  const columnDefs: ColDef<Literature>[] = [
    {
      field: "name",
      headerName: "Title",
      flex: 2,
      sortable: true,
      filter: true,
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
        suppressAndOrCondition: true,
      },
      cellClass: "font-medium",
    },
    {
      field: "authors",
      headerName: "Authors",
      flex: 2,
      sortable: true,
      filter: true,
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
        suppressAndOrCondition: true,
      },
      valueFormatter: (params: ValueFormatterParams<Literature>) => {
        if (Array.isArray(params.value)) {
          return params.value.join(", ");
        }
        return "";
      },
    },
    {
      field: "publisherName",
      headerName: "Publisher",
      flex: 1,
      sortable: true,
      filter: true,
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
        suppressAndOrCondition: true,
      },
    },
    {
      field: "publishYear",
      headerName: "Year",
      width: 100,
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
        suppressAndOrCondition: true,
      },
      type: "numericColumn",
      suppressMenu: true,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      sortable: true,
      filter: true,
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
      },
    },
    {
      field: "type",
      headerName: "Type",
      width: 120,
      sortable: true,
      filter: true,
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
      },
    },
  ];

  const gridOptions: GridOptions<Literature> = {
    columnDefs,
    rowData: props.data,
    rowClass: "row-class",
    defaultColDef: {
      resizable: true,
      getQuickFilterText: (params) => {
        const value = params.value;
        if (Array.isArray(value)) {
          return value.join(" ");
        }
        return value?.toString() || "";
      },
      sortable: true,
      filter: true,
      flex: 1,
      menuTabs: ["filterMenuTab"],
    },
    animateRows: true,
    rowSelection: "single",
    onRowDoubleClicked: (event: RowDoubleClickedEvent<Literature>) => {
      if (event.data) {
        dispatch("literatureSelect", event.data);
      }
    },
    onGridReady: (params: { api: GridApi<Literature> }) => {
      gridApi = params.api;
      dispatch("gridReady", { api: params.api });
      params.api.sizeColumnsToFit();
    },
    cacheQuickFilter: true,
    suppressCellFocus: true,
    suppressMovableColumns: true,
    suppressDragLeaveHidesColumns: true,
    domLayout: "normal",
  };

  onMount(() => {
    createGrid(gridDiv, gridOptions);
  });

  onDestroy(() => {
    if (gridApi) {
      gridApi.destroy();
    }
  });

  $effect(() => {
    if (gridApi && props.data) {
      gridApi.setGridOption("rowData", props.data);
    }
  });
</script>

<div bind:this={gridDiv} class="ag-theme-quartz w-full h-[600px]"></div>

<style>
  /* Base styles */
  :global(.row-class),
  :global(.ag-body),
  :global(.ag-header),
  :global(.ag-header-cell) {
    background-color: #ffffff;
  }

  :global(.row-class),
  :global(.ag-header),
  :global(.ag-header-cell),
  :global(.ag-icon),
  :global(.ag-picker-field-display),
  :global(.ag-input-field-input),
  :global(.ag-standard-button) {
    color: #000000;
  }

  /* Border styles */
  :global(.ag-header),
  :global(.ag-row) {
    border-bottom: 1px solid #2b2e33;
  }

  :global(.ag-header-cell),
  :global(.ag-cell) {
    border-right: 1px solid #2b2e33;
  }

  :global(.ag-header-cell:last-child),
  :global(.ag-cell:last-child) {
    border-right: none;
  }

  /* Popup styles */
  :global(.ag-popup-child) {
    background-color: #ffffff;
    border: 1px solid #2b2e33 !important;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  :global(.ag-filter) {
    background-color: #ffffff !important;
    color: #000000;
  }

  :global(.dark .ag-filter) {
    background-color: #1f2024 !important;
    color: #fff;
  }

  :global(.ag-filter-wrapper) {
    padding: 0.5rem;
  }

  /* Input and button styles */
  :global(.ag-picker-field-wrapper),
  :global(.ag-wrapper.ag-input-wrapper),
  :global(.ag-standard-button) {
    border-radius: 4px;
    border: 1px solid #2b2e33;
  }

  :global(.ag-wrapper.ag-input-wrapper),
  :global(.ag-standard-button) {
    background-color: #f3f4f6;
  }

  :global(.ag-input-field-input) {
    background-color: transparent;
    padding: 0.5rem;
  }

  :global(.ag-standard-button) {
    margin: 0 0.25rem;
  }

  :global(.ag-standard-button:hover),
  :global(.ag-list-item:hover),
  :global(.ag-list-item.ag-active-item) {
    background-color: #e5e7eb;
  }

  /* Dropdown list styles */
  :global(.ag-list-item) {
    color: #000000;
    padding: 0.5rem;
  }

  /* Dark mode overrides */
  :global(.dark) {
    /* Background colors */
    :global(.row-class),
    :global(.ag-body),
    :global(.ag-header),
    :global(.ag-header-cell),
    :global(.ag-root-wrapper),
    :global(.ag-popup-child),
    :global(.ag-filter),
    :global(.ag-filter-apply-panel),
    :global(.ag-list-item),
    :global(.ag-list.ag-select-list) {
      background-color: #1f2024;
    }

    /* Text colors */
    :global(.row-class),
    :global(.ag-header),
    :global(.ag-header-cell),
    :global(.ag-icon),
    :global(.ag-filter),
    :global(.ag-picker-field-display),
    :global(.ag-input-field-input),
    :global(.ag-standard-button),
    :global(.ag-list-item) {
      color: #ffffff;
    }

    /* Input and button styles */
    :global(.ag-wrapper),
    :global(.ag-picker-field-wrapper),
    :global(.ag-input-field-input) {
      background-color: #2b2e33;
      border: 1px solid #374151;
    }

    :global(.ag-standard-button) {
      background-color: #2b2e33;
      border: 1px solid #374151;
      font-weight: 500;
    }

    :global(.ag-standard-button:hover),
    :global(.ag-list-item:hover),
    :global(.ag-list-item.ag-active-item) {
      background-color: #374151;
    }

    /* Popup specific */
    :global(.ag-popup-child) {
      border: 1px solid #2b2e33 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    :global(.ag-filter-apply-panel) {
      border-top: 1px solid #2b2e33;
    }

    :global(.ag-input-field-input::placeholder) {
      color: #9ca3af;
    }
  }
</style>
