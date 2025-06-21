<!-- Custom Events Store -->
<script lang="ts" module>
  // Check if we're in a browser environment
  const browser = typeof window !== "undefined";

  import {
    customEventsAPI,
    isCustomEventAPIError,
    getErrorMessage,
    type CustomEventAPIError,
  } from "../services/custom-events-api";
  import type {
    CustomTimelineEvent,
    CreateCustomEventForm,
    UpdateCustomEventForm,
    CustomEventFilters,
    CustomEventsState,
    CustomEventFormState,
    CustomEventAction,
  } from "../types/custom-events";
  import { DEFAULT_EVENT_TYPE } from "../config/custom-event-types";
  import { projectStore } from "./ProjectStore.svelte";

  // Main state
  let customEventsState = $state<CustomEventsState>({
    events: [],
    loading: false,
    error: null,
    filters: {
      sortBy: "eventTimestamp",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    },
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalEvents: 0,
      perPage: 20,
    },
  });

  // Form state
  let formState = $state<CustomEventFormState>({
    isOpen: false,
    mode: "create",
    data: {
      title: "",
      description: "",
      eventType: DEFAULT_EVENT_TYPE,
      eventTimestamp: new Date(),
      details: [],
      tags: [],
    },
    loading: false,
    errors: {},
  });

  // Cache for individual events (for performance)
  let eventCache = $state<Map<number, CustomTimelineEvent>>(new Map());

  // Active requests tracking (for cancellation)
  let activeRequests = $state<Map<string, AbortController>>(new Map());

  // Optimistic updates tracking
  let optimisticUpdates = $state<Map<string, CustomTimelineEvent>>(new Map());

  // Store implementation
  const customEventsStore = {
    // Getters
    get events() {
      return customEventsState.events;
    },
    get loading() {
      return customEventsState.loading;
    },
    get error() {
      return customEventsState.error;
    },
    get filters() {
      return customEventsState.filters;
    },
    get pagination() {
      return customEventsState.pagination;
    },
    get formState() {
      return formState;
    },
    get hasEvents() {
      return customEventsState.events.length > 0;
    },
    get isFormOpen() {
      return formState.isOpen;
    },

    // State management actions
    dispatch(action: CustomEventAction) {
      switch (action.type) {
        case "SET_LOADING":
          customEventsState.loading = action.payload;
          break;
        case "SET_EVENTS":
          customEventsState.events = action.payload;
          // Update cache
          if (Array.isArray(action.payload)) {
            action.payload.forEach((event) => {
              eventCache.set(event.id, event);
            });
          }
          break;
        case "ADD_EVENT":
          customEventsState.events = [
            action.payload,
            ...customEventsState.events,
          ];
          eventCache.set(action.payload.id, action.payload);
          break;
        case "UPDATE_EVENT":
          const eventIndex = customEventsState.events.findIndex(
            (e) => e.id === action.payload.id
          );
          if (eventIndex !== -1) {
            customEventsState.events[eventIndex] = action.payload;
            customEventsState.events = [...customEventsState.events];
          }
          eventCache.set(action.payload.id, action.payload);
          break;
        case "REMOVE_EVENT":
          customEventsState.events = customEventsState.events.filter(
            (e) => e.id !== action.payload
          );
          eventCache.delete(action.payload);
          break;
        case "SET_ERROR":
          customEventsState.error = action.payload;
          break;
        case "SET_FILTERS":
          customEventsState.filters = {
            ...customEventsState.filters,
            ...action.payload,
          };
          break;
        case "SET_PAGINATION":
          customEventsState.pagination = {
            ...customEventsState.pagination,
            ...action.payload,
          };
          break;
      }
    },

    // API Operations
    async loadEvents(projectId: string, filters?: CustomEventFilters) {
      if (!projectId) return;

      // Don't make repeated calls if there's already a validation error
      if (
        customEventsState.error &&
        customEventsState.error.includes("Validation failed")
      ) {
        return;
      }

      const requestKey = "loadEvents";
      this.cancelRequest(requestKey);

      const controller = new AbortController();
      activeRequests.set(requestKey, controller);

      this.dispatch({ type: "SET_LOADING", payload: true });
      this.dispatch({ type: "SET_ERROR", payload: null });

      try {
        // Clean up filters to ensure valid values only
        const appliedFilters = { ...customEventsState.filters, ...filters };

        // Remove any undefined, null, or empty string values that could cause validation errors
        const cleanedFilters: CustomEventFilters = {};
        Object.entries(appliedFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            cleanedFilters[key as keyof CustomEventFilters] = value as any;
          }
        });

        const response = await customEventsAPI.getCustomEvents(
          projectId,
          cleanedFilters,
          { signal: controller.signal }
        );

        this.dispatch({ type: "SET_EVENTS", payload: response.data });
        this.dispatch({
          type: "SET_PAGINATION",
          payload: {
            currentPage: response.meta.currentPage,
            totalPages: response.meta.lastPage,
            totalEvents: response.meta.total,
            perPage: response.meta.perPage,
          },
        });

        if (filters) {
          this.dispatch({ type: "SET_FILTERS", payload: filters });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error loading custom events:", error);
          this.dispatch({ type: "SET_ERROR", payload: getErrorMessage(error) });
        }
      } finally {
        if (!controller.signal.aborted) {
          this.dispatch({ type: "SET_LOADING", payload: false });
        }
        activeRequests.delete(requestKey);
      }
    },

    async createEvent(projectId: string, eventData: CreateCustomEventForm) {
      if (!projectId) throw new Error("Project ID is required");

      const requestKey = "createEvent";
      this.cancelRequest(requestKey);

      const controller = new AbortController();
      activeRequests.set(requestKey, controller);

      formState.loading = true;
      formState.errors = {};

      // Create optimistic event for immediate UI feedback
      const optimisticEvent: CustomTimelineEvent = {
        id: Date.now(), // Temporary ID
        projectId,
        userId: "current-user", // Will be updated from response
        title: eventData.title,
        description: eventData.description || null,
        eventType: eventData.eventType,
        eventTimestamp: eventData.eventTimestamp.toISOString(),
        details: eventData.details || null,
        tags: eventData.tags || null,
        creator: null, // Will be updated from response
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: true,
      };

      // Add optimistic update
      const optimisticKey = `create_${optimisticEvent.id}`;
      optimisticUpdates.set(optimisticKey, optimisticEvent);
      this.dispatch({ type: "ADD_EVENT", payload: optimisticEvent });

      try {
        const response = await customEventsAPI.createCustomEvent(
          projectId,
          eventData,
          { signal: controller.signal }
        );

        // Remove optimistic update
        optimisticUpdates.delete(optimisticKey);

        // Remove optimistic event and add real event
        this.dispatch({ type: "REMOVE_EVENT", payload: optimisticEvent.id });
        this.dispatch({ type: "ADD_EVENT", payload: response.event });

        // Close form on success
        this.closeForm();

        return response.event;
      } catch (error) {
        // Remove optimistic update on error
        optimisticUpdates.delete(optimisticKey);
        this.dispatch({ type: "REMOVE_EVENT", payload: optimisticEvent.id });

        if (!controller.signal.aborted) {
          console.error("Error creating custom event:", error);

          if (isCustomEventAPIError(error) && error.errors) {
            formState.errors = this.processValidationErrors(error.errors);
          } else {
            formState.errors = { general: getErrorMessage(error) };
          }
        }
        throw error;
      } finally {
        if (!controller.signal.aborted) {
          formState.loading = false;
        }
        activeRequests.delete(requestKey);
      }
    },

    async updateEvent(eventId: number, eventData: UpdateCustomEventForm) {
      const requestKey = `updateEvent_${eventId}`;
      this.cancelRequest(requestKey);

      const controller = new AbortController();
      activeRequests.set(requestKey, controller);

      formState.loading = true;
      formState.errors = {};

      // Get current event for rollback
      const currentEvent =
        eventCache.get(eventId) ||
        customEventsState.events.find((e) => e.id === eventId);

      if (!currentEvent) {
        throw new Error("Event not found");
      }

      // Create optimistic update
      const optimisticEvent: CustomTimelineEvent = {
        ...currentEvent,
        ...eventData,
        eventTimestamp:
          eventData.eventTimestamp?.toISOString() ||
          currentEvent.eventTimestamp,
        updatedAt: new Date().toISOString(),
      };

      const optimisticKey = `update_${eventId}`;
      optimisticUpdates.set(optimisticKey, optimisticEvent);
      this.dispatch({ type: "UPDATE_EVENT", payload: optimisticEvent });

      try {
        const response = await customEventsAPI.updateCustomEvent(
          eventId,
          eventData,
          { signal: controller.signal }
        );

        // Remove optimistic update and apply real update
        optimisticUpdates.delete(optimisticKey);
        this.dispatch({ type: "UPDATE_EVENT", payload: response.event });

        // Close form on success
        this.closeForm();

        return response.event;
      } catch (error) {
        // Rollback optimistic update
        optimisticUpdates.delete(optimisticKey);
        this.dispatch({ type: "UPDATE_EVENT", payload: currentEvent });

        if (!controller.signal.aborted) {
          console.error("Error updating custom event:", error);

          if (isCustomEventAPIError(error) && error.errors) {
            formState.errors = this.processValidationErrors(error.errors);
          } else {
            formState.errors = { general: getErrorMessage(error) };
          }
        }
        throw error;
      } finally {
        if (!controller.signal.aborted) {
          formState.loading = false;
        }
        activeRequests.delete(requestKey);
      }
    },

    async deleteEvent(eventId: number) {
      const requestKey = `deleteEvent_${eventId}`;
      this.cancelRequest(requestKey);

      const controller = new AbortController();
      activeRequests.set(requestKey, controller);

      // Get current event for rollback
      const currentEvent =
        eventCache.get(eventId) ||
        customEventsState.events.find((e) => e.id === eventId);

      if (!currentEvent) {
        throw new Error("Event not found");
      }

      // Optimistic removal
      const optimisticKey = `delete_${eventId}`;
      optimisticUpdates.set(optimisticKey, currentEvent);
      this.dispatch({ type: "REMOVE_EVENT", payload: eventId });

      try {
        await customEventsAPI.deleteCustomEvent(eventId, {
          signal: controller.signal,
        });

        // Confirm removal
        optimisticUpdates.delete(optimisticKey);
      } catch (error) {
        // Rollback optimistic removal
        optimisticUpdates.delete(optimisticKey);
        this.dispatch({ type: "ADD_EVENT", payload: currentEvent });

        if (!controller.signal.aborted) {
          console.error("Error deleting custom event:", error);
          this.dispatch({ type: "SET_ERROR", payload: getErrorMessage(error) });
        }
        throw error;
      } finally {
        activeRequests.delete(requestKey);
      }
    },

    async getEvent(eventId: number) {
      // Check cache first
      const cached = eventCache.get(eventId);
      if (cached) return cached;

      const requestKey = `getEvent_${eventId}`;
      this.cancelRequest(requestKey);

      const controller = new AbortController();
      activeRequests.set(requestKey, controller);

      try {
        const event = await customEventsAPI.getCustomEvent(eventId, {
          signal: controller.signal,
        });
        eventCache.set(eventId, event);
        return event;
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error fetching custom event:", error);
        }
        throw error;
      } finally {
        activeRequests.delete(requestKey);
      }
    },

    // Form management
    openCreateForm() {
      // Cancel any existing form-related requests
      this.cancelRequest("createEvent");

      // Just set the form state without toggling isOpen
      formState.mode = "create";
      formState.eventId = undefined;
      formState.data = {
        title: "",
        description: "",
        eventType: DEFAULT_EVENT_TYPE,
        eventTimestamp: new Date(),
        details: [],
        tags: [],
      };
      formState.loading = false;
      formState.errors = {};
      formState.isOpen = true; // Set this last
    },

    async openEditForm(eventId: number) {
      // Cancel any existing form-related requests
      this.cancelRequest(`getEvent_${eventId}`);

      // Set up for edit without toggling isOpen
      formState.mode = "edit";
      formState.eventId = eventId;
      formState.loading = false;
      formState.errors = {};
      formState.isOpen = true; // Set this before async operation

      try {
        // Force a fresh fetch by bypassing cache
        const requestKey = `getEvent_${eventId}`;
        const controller = new AbortController();
        activeRequests.set(requestKey, controller);

        const event = await customEventsAPI.getCustomEvent(eventId, {
          signal: controller.signal,
        });

        // Update cache with fresh data
        eventCache.set(eventId, event);

        // Populate form with fresh data
        formState.data = {
          title: event.title,
          description: event.description || "",
          eventType: event.eventType,
          eventTimestamp: new Date(event.eventTimestamp),
          details: event.details || [],
          tags: event.tags || [],
        };

        activeRequests.delete(requestKey);
      } catch (error) {
        console.error("Error loading event for editing:", error);
        formState.errors = { general: "Failed to load event details" };
      }
    },

    closeForm() {
      formState.isOpen = false;
      formState.mode = "create";
      formState.eventId = undefined;
      formState.data = {
        title: "",
        description: "",
        eventType: DEFAULT_EVENT_TYPE,
        eventTimestamp: new Date(),
        details: [],
        tags: [],
      };
      formState.loading = false;
      formState.errors = {};
    },

    updateFormData(updates: Partial<CreateCustomEventForm>) {
      formState.data = { ...formState.data, ...updates };
    },

    // Utility methods
    cancelRequest(requestKey: string) {
      const controller = activeRequests.get(requestKey);
      if (controller) {
        controller.abort();
        activeRequests.delete(requestKey);
      }
    },

    cancelAllRequests() {
      activeRequests.forEach((controller) => controller.abort());
      activeRequests.clear();
    },

    clearError() {
      this.dispatch({ type: "SET_ERROR", payload: null });
    },

    clearCache() {
      eventCache.clear();
    },

    processValidationErrors(errors: any): Record<string, string> {
      const processed: Record<string, string> = {};

      Object.entries(errors).forEach(([field, messages]) => {
        if (Array.isArray(messages) && messages.length > 0) {
          processed[field] = messages[0];
        }
      });

      return processed;
    },

    // Filters and pagination
    updateFilters(newFilters: Partial<CustomEventFilters>) {
      this.dispatch({ type: "SET_FILTERS", payload: newFilters });

      // Reload events with new filters if we have a project
      if (browser && projectStore.currentProject?.id) {
        this.loadEvents(
          projectStore.currentProject.id,
          customEventsState.filters
        );
      }
    },

    resetFilters() {
      const defaultFilters = {
        sortBy: "eventTimestamp" as const,
        sortOrder: "desc" as const,
        page: 1,
        limit: 20,
      };
      this.dispatch({ type: "SET_FILTERS", payload: defaultFilters });

      if (browser && projectStore.currentProject?.id) {
        this.loadEvents(projectStore.currentProject.id, defaultFilters);
      }
    },

    async loadNextPage() {
      if (
        customEventsState.pagination.currentPage <
        customEventsState.pagination.totalPages
      ) {
        const nextPage = customEventsState.pagination.currentPage + 1;
        await this.updateFilters({ page: nextPage });
      }
    },

    async loadPreviousPage() {
      if (customEventsState.pagination.currentPage > 1) {
        const previousPage = customEventsState.pagination.currentPage - 1;
        await this.updateFilters({ page: previousPage });
      }
    },

    // Search functionality
    async searchEvents(query: string, projectId?: string) {
      if (!query.trim()) {
        return this.resetFilters();
      }

      return this.updateFilters({ search: query.trim(), page: 1 });
    },

    // Cleanup method for navigation
    cleanup() {
      // Close form if open
      if (formState.isOpen) {
        this.closeForm();
      }

      // Cancel all active requests
      this.cancelAllRequests();

      // Clear any error states
      this.clearError();

      // Reset form state completely
      formState.isOpen = false;
      formState.mode = "create";
      formState.eventId = undefined;
      formState.data = {
        title: "",
        description: "",
        eventType: DEFAULT_EVENT_TYPE,
        eventTimestamp: new Date(),
        details: [],
        tags: [],
      };
      formState.loading = false;
      formState.errors = {};
    },
  };

  // Export the store
  export { customEventsStore };

  // Cleanup on destroy
  if (browser) {
    // Cancel all requests when the component is destroyed
    // This would be handled by the component using this store
  }
</script>
