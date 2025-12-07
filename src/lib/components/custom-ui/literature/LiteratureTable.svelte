<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { createGrid, ModuleRegistry } from "@ag-grid-community/core";
  import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
  import "@ag-grid-community/styles/ag-grid.css";
  import "@ag-grid-community/styles/ag-theme-quartz.css";
  import type { Literature } from "$lib/types/literature";
  import type {
    ValueFormatterParams,
    ICellRendererParams,
    GridApi,
    GridOptions,
    ColDef,
  } from "@ag-grid-community/core";
  import {
    BookOpen,
    CheckCircle2,
    Clock,
    Archive,
    AlertCircle,
  } from "lucide-svelte";
  import { API_BASE_URL } from '$lib/config';
  import { openUrlInNewTab } from '$lib/utils/browser';

  // Register required modules
  ModuleRegistry.registerModules([ClientSideRowModelModule]);

  const props = $props<{ data: Literature[] }>();
  const dispatch = createEventDispatcher<{
    literatureSelect: Literature;
    gridReady: { api: GridApi<Literature> };
    selectionChanged: { selectedItems: Literature[] };
  }>();

  let gridDiv: HTMLElement;
  let gridApi: GridApi<Literature>;

  const statusConfig = {
    "Not Started": {
      icon: AlertCircle,
      color: "text-yellow-500 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    Reading: {
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    "Note Taking": {
      icon: Clock,
      color: "text-purple-500 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    Completed: {
      icon: CheckCircle2,
      color: "text-green-500 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    Archived: {
      icon: Archive,
      color: "text-gray-500 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/20",
    },
  };

  function StatusCellRenderer(props: ICellRendererParams<Literature>) {
    const status = props.value || "Not Started";
    const config = statusConfig[status as keyof typeof statusConfig];

    const container = document.createElement("div");
    container.className = "flex items-center gap-2";

    const iconContainer = document.createElement("div");
    iconContainer.className = `p-1.5 rounded-md ${config.bgColor}`;

    // Use a simple div with the icon class
    iconContainer.innerHTML = `<div class="${config.color} w-4 h-4" data-status-icon="${status.toLowerCase()}"></div>`;

    container.appendChild(iconContainer);

    const text = document.createElement("span");
    text.textContent = status;
    container.appendChild(text);

    return container;
  }

  const columnDefs: ColDef<Literature>[] = [
    {
      headerName: "",
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressMenu: true,
      lockPosition: "left",
    },
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
      field: "status",
      headerName: "Status",
      width: 160,
      sortable: true,
      filter: true,
      cellRenderer: StatusCellRenderer,
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
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
    {
      field: "createdAt",
      headerName: "Added On",
      width: 150,
      sortable: true,
      filter: "agDateColumnFilter",
      filterParams: {
        buttons: ["reset", "apply"],
        closeOnApply: true,
        suppressAndOrCondition: true,
        comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
          const cellDate = new Date(cellValue);

          if (isNaN(cellDate.getTime())) return -1;
          if (isNaN(filterLocalDateAtMidnight.getTime())) return -1;

          const cellDateMidnight = new Date(
            cellDate.getFullYear(),
            cellDate.getMonth(),
            cellDate.getDate()
          );

          if (cellDateMidnight < filterLocalDateAtMidnight) {
            return -1;
          } else if (cellDateMidnight > filterLocalDateAtMidnight) {
            return 1;
          } else {
            return 0;
          }
        },
      },
      valueFormatter: (params: ValueFormatterParams<Literature>) => {
        if (params.value) {
          try {
            // Assuming params.value is an ISO string like "2024-07-25T10:30:00.000Z"
            const date = new Date(params.value);
            return date.toLocaleDateString("en-CA"); // Format as YYYY-MM-DD
          } catch (e) {
            console.error("Error formatting date:", e);
            return params.value; // Return original value if formatting fails
          }
        }
        return "";
      },
      suppressMenu: true,
    },
    {
      field: "sourceFileId",
      headerName: "File",
      width: 100,
      sortable: true,
      comparator: (a: string | undefined, b: string | undefined) => {
        const aHas = !!a;
        const bHas = !!b;
        if (aHas === bHas) return 0;
        // In ascending order: items without a file (false) come before those with a file (true)
        return aHas ? 1 : -1;
      },
      filter: false,
      suppressMenu: true,
      // Ensure content in this cell is vertically centered
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<Literature>) => {
        if (!params.value) {
          return '';
        }
        
        const container = document.createElement('div');
        // Fill the full cell height and center icons
        container.className = 'h-full flex items-center justify-center gap-1';
        
        // Preview button
        const previewButton = document.createElement('button');
        previewButton.className = 'inline-flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors leading-none';
        previewButton.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        `;
        previewButton.title = 'Preview document';
        
        previewButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          await previewDocument(params.value, params.data?.name || 'document');
        });
        
        // Download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'inline-flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors leading-none';
        downloadButton.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
        `;
        downloadButton.title = 'Download document';
        
        downloadButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          await downloadDocument(params.value, params.data?.name || 'document');
        });
        
        container.appendChild(previewButton);
        container.appendChild(downloadButton);
        return container;
      },
    },
  ];

  const gridOptions: GridOptions<Literature> = {
    columnDefs,
    rowData: props.data,
    rowClass: "row-class cursor-pointer hover:bg-muted",
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
    rowSelection: "multiple",
    onRowClicked: (event) => {
      if (
        event.data &&
        !(event.event?.target as HTMLElement)?.closest(".ag-checkbox-input-wrapper")
      ) {
        dispatch("literatureSelect", event.data);
      }
    },
    onSelectionChanged: () => {
      if (gridApi) {
        const selectedRows = gridApi.getSelectedRows();
        dispatch("selectionChanged", { selectedItems: selectedRows });
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

  import { toast } from 'svelte-sonner';

  async function previewDocument(fileId: string, filename: string) {
    try {
      const endpoint = `${API_BASE_URL}/documents/${fileId}/download?preview=true`;
      const response = await fetch(endpoint, {
        credentials: 'include',
      });

      if (!response.ok) {
        let message = 'Failed to get preview URL';
        try {
          const err = await response.json();
          if (err?.message) message = err.message;
        } catch {}
        toast.error('Unable to preview document', { description: message });
        // Fallback to download in case preview inline fails
        await downloadDocument(fileId, filename);
        return;
      }

      const data = await response.json();

      // Open the signed URL directly (no CORS fetch needed)
      const url: unknown = data?.downloadUrl;
      if (typeof url !== 'string' || url.length === 0) {
        toast.error('Unable to preview document', { description: 'Missing download URL' });
        // Fallback to download in case preview inline fails
        await downloadDocument(fileId, filename);
        return;
      }
      openUrlInNewTab(url);
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Unable to preview document', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      // Fallback to download
      await downloadDocument(fileId, filename);
    }
  }

  async function downloadDocument(fileId: string, filename: string) {
    try {
      const endpoint = `${API_BASE_URL}/documents/${fileId}/download`;
      const response = await fetch(endpoint, {
        credentials: 'include',
      });

      if (!response.ok) {
        let message = 'Failed to get download URL';
        try {
          const err = await response.json();
          if (err?.message) message = err.message;
        } catch {}
        throw new Error(message);
      }

      const data = await response.json();
      
      // Create a download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Download error:', err);
      // Could show a toast error here
    }
  }

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

  /* New styles for status icons */
  :global([data-status-icon="not started"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
  }

  :global([data-status-icon="reading"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>');
  }

  :global([data-status-icon="note taking"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>');
  }

  :global([data-status-icon="completed"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>');
  }

  :global([data-status-icon="archived"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>');
  }

  :global(.dark [data-status-icon="not started"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
  }

  :global(.dark [data-status-icon="reading"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>');
  }

  :global(.dark [data-status-icon="note taking"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>');
  }

  :global(.dark [data-status-icon="completed"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>');
  }

  :global(.dark [data-status-icon="archived"]) {
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>');
  }

  :global([data-status-icon]) {
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
  }
</style>
