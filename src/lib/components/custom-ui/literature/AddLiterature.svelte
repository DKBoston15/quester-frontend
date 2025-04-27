<!-- src/lib/components/custom-ui/literature/AddLiterature.svelte -->
<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import * as Label from "$lib/components/ui/label";
  import { Progress } from "$lib/components/ui/progress";
  import TagInput from "../TagInput.svelte";
  import { createEventDispatcher, onDestroy } from "svelte";
  import { auth } from "$lib/stores/AuthStore.svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore.svelte";
  import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    BookOpen,
    Plus,
    X,
  } from "lucide-svelte";
  import { API_BASE_URL } from "$lib/config";
  // Note: driver.js CSS is imported at the page level only

  const dispatch = createEventDispatcher();

  const { projectId, isOpen, onOpenChange } = $props<{
    projectId?: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }>();
  const urlProjectId = projectId;

  type LiteratureType = {
    label: string;
    value: string;
  };

  type LiteratureEntry = {
    name: string;
    second_name: string;
    authors: string[];
    editors: string[];
    publisher_name: string;
    publish_year: string;
    volume: string;
    issue: string;
    start_page: string;
    end_page: string;
    type: LiteratureType;
    link: string;
    start_date?: Date;
    end_date?: Date;
    city: string;
    status?: "success" | "failure" | "Not Started";
  };

  // State management
  let activeTab = $state("paste");
  let pasteText = $state("");
  let isProcessing = $state(false);
  let processingProgress = $state(0);
  let extractedReferences = $state<LiteratureEntry[]>([]);
  let selectedReference = $state<LiteratureEntry | null>(null);
  let processingError = $state<string | null>(null);
  let isSaving = $state(false);
  let saveProgress = $state(0);
  let saveSuccess = $state(false);

  // Progress simulation interval
  let progressInterval: NodeJS.Timeout | null = null;

  // Manual entry state
  let name = $state("");
  let second_name = $state("");
  let authors = $state<string[]>([]);
  let editors = $state<string[]>([]);
  let publisher_name = $state("");
  let publish_year = $state("");
  let volume = $state("");
  let issue = $state("");
  let start_page = $state("");
  let end_page = $state("");
  let type = $state({ label: "Journal Article", value: "Journal Article" });
  let link = $state("");
  let start_date = $state<Date | undefined>(undefined);
  let end_date = $state<Date | undefined>(undefined);
  let city = $state("");

  // Create a derived manualEntry object
  let manualEntry = $derived({
    name,
    second_name,
    authors,
    editors,
    publisher_name,
    publish_year,
    volume,
    issue,
    start_page,
    end_page,
    type,
    link,
    start_date,
    end_date,
    city,
  });

  // Literature type options
  const literatureTypes: LiteratureType[] = [
    { label: "Journal Article", value: "Journal Article" },
    { label: "Literature Review", value: "Literature Review" },
    { label: "Book", value: "Book" },
    { label: "Book Chapter", value: "Book Chapter" },
    { label: "Conference Presentation", value: "Conference Presentation" },
    { label: "Conference Proceedings", value: "Conference Proceedings" },
    { label: "Dissertation", value: "Dissertation" },
    { label: "Website", value: "Website" },
    { label: "Newspaper Article", value: "Newspaper Article" },
    { label: "Other", value: "Other" },
  ];

  function startProgressSimulation(
    initialValue: number = 0,
    targetValue: number = 85
  ) {
    if (progressInterval) clearInterval(progressInterval);
    processingProgress = initialValue;

    progressInterval = setInterval(() => {
      if (processingProgress < targetValue) {
        processingProgress += Math.random() * 3;
        if (processingProgress > targetValue) {
          processingProgress = targetValue;
        }
      }
    }, 200);
  }

  function stopProgressSimulation() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  async function processReferences() {
    if (!pasteText.trim()) return;

    isProcessing = true;
    processingProgress = 0;
    processingError = null;
    extractedReferences = [];

    // Start progress immediately
    startProgressSimulation(0, 85);

    try {
      // DEV MODE: Use test data instead of API call
      const USE_TEST_DATA = false; // Toggle this to switch between test data and real API

      if (USE_TEST_DATA) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        extractedReferences = [
          {
            name: "The Impact of AI on Modern Software Development The Impact of AI on Modern Software Development The Impact of AI on Modern Software Development The Impact of AI on Modern Software Development",
            second_name: "",
            authors: ["John Smith", "Sarah Johnson"],
            editors: [],
            publisher_name: "Journal of Computer Science",
            publish_year: "2023",
            volume: "15",
            issue: "4",
            start_page: "123",
            end_page: "145",
            type: { label: "Journal Article", value: "Journal Article" },
            link: "https://example.com/article1",
            city: "",
            status: "success",
          },
          {
            name: "Machine Learning Approaches in Healthcare",
            second_name: "",
            authors: ["Michael Brown", "Emily Davis", "Robert Wilson"],
            editors: [],
            publisher_name: "Medical Technology Review",
            publish_year: "2022",
            volume: "",
            issue: "",
            start_page: "",
            end_page: "",
            type: { label: "Literature Review", value: "Literature Review" },
            link: "",
            city: "",
            status: "success",
          },
          {
            name: "Quantum Computing: A Comprehensive Guide",
            second_name: "",
            authors: ["Alice Chen"],
            editors: [],
            publisher_name: "Tech Publishing House",
            publish_year: "2023",
            volume: "",
            issue: "",
            start_page: "",
            end_page: "",
            type: { label: "Book", value: "Book" },
            link: "",
            city: "New York",
            status: "failure",
          },
        ];

        stopProgressSimulation();
        processingProgress = 100;
        return;
      }

      const response = await fetch(`${API_BASE_URL}/ai/extract-references`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceText: pasteText,
          projectId: urlProjectId,
        }),
      });

      if (!response.ok) throw new Error("Failed to process references");

      const data = await response.json();

      // Map the references and add status
      extractedReferences = data.map((ref: any) => ({
        ...ref,
        status: ref.name && ref.authors ? "success" : "failure",
      }));

      stopProgressSimulation();
      processingProgress = 100;
    } catch (error) {
      stopProgressSimulation();
      console.error("Error processing references:", error);
      processingError =
        error instanceof Error ? error.message : "Failed to process references";
    } finally {
      if (!processingError) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      isProcessing = false;
    }
  }

  async function saveLiterature(reference: any, isUpdate: boolean = false) {
    try {
      isSaving = true;
      saveProgress = 0;
      startProgressSimulation(0, 90);

      // Add a small delay to show initial progress
      await new Promise((resolve) => setTimeout(resolve, 200));

      // For updates, use the reference directly. For bulk saves, filter successful references
      const refsToSave = isUpdate
        ? [reference] // Single reference update
        : Array.isArray(reference)
          ? reference.filter((ref) => ref.status === "success") // Bulk save with filtering
          : [reference]; // Single reference add

      const results = await Promise.all(
        refsToSave.map(async (ref) => {
          const authors = ref.authors || [];
          const editors = ref.editors || [];

          const literatureData = {
            name: ref.name,
            secondName: ref.second_name || "",
            authors: JSON.stringify(authors),
            editors: JSON.stringify(editors),
            publisherName: ref.publisher_name || "",
            publishYear: String(ref.publish_year || ""),
            volume: String(ref.volume || ""),
            issue: String(ref.issue || ""),
            startPage: String(ref.start_page || ""),
            endPage: String(ref.end_page || ""),
            type: ref.type?.value || "Other",
            link: ref.link || "",
            startDate: ref.start_date ? ref.start_date.toString() : null,
            endDate: ref.end_date ? ref.end_date.toString() : null,
            city: ref.city || "",
            status: "Not Started",
            projectId: urlProjectId,
            userId: auth.user?.id,
          };

          const response = await fetch(`${API_BASE_URL}/literature`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(literatureData),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to save literature");
          }

          return response.json();
        })
      );

      stopProgressSimulation();
      saveProgress = 100;
      saveSuccess = true;

      // Update the literature store
      const addedLiterature = results.map((result) => result.literature);

      // Dispatch event for any parent components
      dispatch("literature-added", addedLiterature);

      // First reset the form
      resetForm();

      // Then update the store
      await literatureStore.loadLiterature(urlProjectId);

      // Finally close the dialog
      onOpenChange?.(false);
    } catch (error) {
      stopProgressSimulation();
      console.error("Error saving literature:", error);
      processingError =
        error instanceof Error ? error.message : "Failed to save literature";
    } finally {
      isSaving = false;
      saveSuccess = false;
      saveProgress = 0;
    }
  }

  function resetForm() {
    pasteText = "";
    extractedReferences = [];
    selectedReference = null;
    processingError = null;
    processingProgress = 0;
    name = "";
    second_name = "";
    authors = [];
    editors = [];
    publisher_name = "";
    publish_year = "";
    volume = "";
    issue = "";
    start_page = "";
    end_page = "";
    type = { label: "Journal Article", value: "Journal Article" };
    link = "";
    start_date = undefined;
    end_date = undefined;
    city = "";
  }

  // Handle closing
  function handleClose() {
    onOpenChange?.(false);
  }

  function onTabChange(value: string) {
    activeTab = value;
  }

  function onTypeChange(value: string) {
    const newType = literatureTypes.find((t) => t.value === value);
    if (newType) {
      if (selectedReference) {
        selectedReference.type = newType;
      } else {
        type = newType;
      }
    }
  }

  // Fix button bindings
  async function handleSaveLiterature() {
    try {
      if (!name || authors.length === 0) {
        processingError = "Title and at least one author are required";
        return;
      }
      processingError = null;
      await saveLiterature(manualEntry);
    } catch (error) {
      console.error("Error in handleSaveLiterature:", error);
      processingError =
        error instanceof Error ? error.message : "Failed to save literature";
    }
  }

  function handleProcessReferences() {
    processReferences();
  }

  $effect(() => {
    if (!isOpen) {
      stopProgressSimulation();
      resetForm();
    }
  });

  onDestroy(() => {
    stopProgressSimulation();
  });
</script>

<Dialog.Root open={isOpen} onOpenChange={(o) => onOpenChange?.(o)}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/80 opacity-25" />
    <Dialog.Content
      class="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[95vw] max-w-3xl rounded-lg border bg-background shadow-lg"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b p-4">
        <Dialog.Title class="text-xl font-semibold">Add Literature</Dialog.Title
        >
      </div>

      <!-- Tabs -->
      <Tabs.Root value={activeTab} class="w-full" onValueChange={onTabChange}>
        <Tabs.List class="border-b px-4 dark:bg-background">
          <Tabs.Trigger value="paste" class="flex-1">
            <BookOpen class="h-4 w-4 mr-2" />
            Paste References
          </Tabs.Trigger>
          <Tabs.Trigger value="manual" class="flex-1">
            <Plus class="h-4 w-4 mr-2" />
            Manual Entry
          </Tabs.Trigger>
        </Tabs.List>

        <!-- Content Area - Fixed height with scrolling -->
        <div class="max-h-[calc(85vh-8rem)] overflow-y-auto overflow-x-hidden">
          <div class="p-4">
            <Tabs.Content value="paste" class="space-y-4">
              <!-- Paste Area -->
              {#if extractedReferences.length === 0}
                <div class="space-y-4">
                  <Label.Root>Paste your references</Label.Root>
                  <Textarea
                    bind:value={pasteText}
                    placeholder="Paste your references here, separated by empty lines..."
                    rows={8}
                    disabled={isProcessing}
                  />
                  <Button
                    class="w-full"
                    onclick={handleProcessReferences}
                    disabled={!pasteText.trim() || isProcessing}
                  >
                    {#if isProcessing}
                      <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    {:else}
                      Process References
                    {/if}
                  </Button>
                </div>
              {/if}

              {#if isProcessing || isSaving}
                <div class="space-y-2">
                  <Progress
                    value={isProcessing ? processingProgress : saveProgress}
                    class="{saveSuccess
                      ? 'bg-green-500'
                      : ''} transition-all duration-200"
                  />
                  <p class="text-sm text-muted-foreground text-center">
                    {#if isProcessing}
                      Analyzing and extracting references...
                    {:else if isSaving}
                      {#if saveSuccess}
                        References saved successfully!
                      {:else}
                        Saving references...
                      {/if}
                    {/if}
                  </p>
                </div>
              {/if}

              {#if processingError}
                <div
                  class="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center space-x-2"
                >
                  <AlertCircle class="h-5 w-5" />
                  <p>{processingError}</p>
                </div>
              {/if}

              <!-- Extracted References -->
              {#if extractedReferences.length > 0}
                <div class="space-y-4">
                  <h3 class="text-lg font-semibold">
                    Extracted References ({extractedReferences.length})
                  </h3>
                  <div class="space-y-2">
                    {#each extractedReferences as reference}
                      <div
                        class="w-full flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div class="flex-1 min-w-0 mr-4 overflow-hidden">
                          <p class="font-medium break-words">
                            {reference.name || "Untitled Reference"}
                          </p>
                          <p class="text-sm text-muted-foreground break-words">
                            {reference.authors?.join(", ") || "No authors"}
                          </p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          {#if reference.status === "success"}
                            <Badge variant="success" class="shrink-0">
                              <CheckCircle2 class="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          {:else}
                            <Badge variant="destructive" class="shrink-0">
                              <AlertCircle class="h-3 w-3 mr-1" />
                              Needs Review
                            </Badge>
                          {/if}
                          <Button
                            variant="outline"
                            size="sm"
                            onclick={() => (selectedReference = reference)}
                            >Edit</Button
                          >
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </Tabs.Content>

            <Tabs.Content value="manual" class="space-y-4">
              <!-- Manual Entry Form -->
              <div id="manual-entry-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label.Root for="manual-entry-name">Name (Title)</Label.Root
                    >
                    <Input
                      id="manual-entry-name"
                      bind:value={name}
                      placeholder="Enter article or book title"
                    />
                  </div>

                  <!-- Authors -->
                  <div class="space-y-2">
                    <Label.Root>Authors</Label.Root>
                    <TagInput
                      tags={authors}
                      on:change={(e) => (authors = e.detail)}
                      placeholder="Add authors"
                    />
                  </div>

                  <!-- Type -->
                  <div class="space-y-2">
                    <Label.Root>Type</Label.Root>
                    <Select.Root
                      type="single"
                      value={type.value}
                      onValueChange={(value) => onTypeChange(value)}
                    >
                      <Select.Trigger>
                        <span>{type.label}</span>
                      </Select.Trigger>
                      <Select.Content>
                        {#each literatureTypes as type}
                          <Select.Item value={type.value} label={type.label}>
                            {#snippet children({ selected })}
                              {type.label}
                              {#if selected}
                                <div class="ml-auto">✓</div>
                              {/if}
                            {/snippet}
                          </Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  </div>

                  <!-- Publication Details -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <Label.Root>Publisher</Label.Root>
                      <Input
                        bind:value={publisher_name}
                        placeholder="Publisher name"
                      />
                    </div>
                    <div class="space-y-2">
                      <Label.Root>Year</Label.Root>
                      <Input
                        bind:value={publish_year}
                        placeholder="Publication year"
                      />
                    </div>
                  </div>

                  <!-- Additional Fields based on type -->
                  {#if type.value === "Journal Article"}
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <Label.Root>Volume</Label.Root>
                        <Input
                          bind:value={volume}
                          placeholder="Volume number"
                        />
                      </div>
                      <div class="space-y-2">
                        <Label.Root>Issue</Label.Root>
                        <Input bind:value={issue} placeholder="Issue number" />
                      </div>
                    </div>
                  {/if}

                  <!-- Link -->
                  <div class="space-y-2">
                    <Label.Root>Link</Label.Root>
                    <Input
                      bind:value={link}
                      placeholder="URL to the literature"
                    />
                  </div>

                  <!-- Add Literature Button -->
                  <Button
                    class="w-full mt-4"
                    onclick={handleSaveLiterature}
                    disabled={isSaving}
                  >
                    {#if isSaving}
                      <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    {:else}
                      Add Literature
                    {/if}
                  </Button>

                  {#if processingError}
                    <div
                      class="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center space-x-2"
                    >
                      <AlertCircle class="h-5 w-5" />
                      <p>{processingError}</p>
                    </div>
                  {/if}
                </div>
              </div>
            </Tabs.Content>
          </div>

          <!-- Footer -->
          {#if extractedReferences.length > 0 && activeTab === "paste"}
            <div class="border-t p-4 flex justify-end gap-2 bg-background">
              <Button
                variant="default"
                onclick={() => saveLiterature(extractedReferences)}
                disabled={!extractedReferences.some(
                  (ref) => ref.status === "success"
                )}
              >
                Save All References
              </Button>
              <Button variant="outline" onclick={handleClose}>Cancel</Button>
            </div>
          {/if}
        </div>
      </Tabs.Root>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Edit Reference Dialog -->
{#if selectedReference}
  <Dialog.Root
    open={!!selectedReference}
    onOpenChange={(open) => {
      if (!open) {
        // Only set to null after dialog is closed
        setTimeout(() => {
          selectedReference = null;
        }, 0);
      }
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
      <Dialog.Content
        class="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[95vw] max-w-3xl rounded-lg border bg-background shadow-lg"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b p-4">
          <Dialog.Title class="text-xl font-semibold"
            >Edit Reference</Dialog.Title
          >
        </div>

        <!-- Content Area - Fixed height with scrolling -->
        <div class="max-h-[calc(85vh-8rem)] overflow-y-auto p-4">
          <div class="space-y-4">
            <!-- Form Fields -->
            <div class="space-y-2">
              <Label.Root>Title</Label.Root>
              <Input bind:value={selectedReference.name} placeholder="Title" />
            </div>

            {#if selectedReference.type?.value === "Book Chapter" || selectedReference.type?.value === "Conference Presentation"}
              <div class="space-y-2">
                <Label.Root>
                  {#if selectedReference.type?.value === "Book Chapter"}
                    Chapter Title
                  {:else if selectedReference.type?.value === "Conference Presentation"}
                    Conference Name
                  {/if}
                </Label.Root>
                <Input
                  bind:value={selectedReference.second_name}
                  placeholder="Second Title"
                />
              </div>
            {/if}

            <div class="space-y-2">
              <Label.Root>Authors</Label.Root>
              <TagInput
                tags={selectedReference!.authors}
                on:change={(e: CustomEvent<string[]>) =>
                  (selectedReference!.authors = e.detail)}
                placeholder="Add authors"
              />
            </div>

            {#if selectedReference.type?.value === "Book Chapter"}
              <div class="space-y-2">
                <Label.Root>Editors</Label.Root>
                <TagInput
                  tags={selectedReference!.editors}
                  on:change={(e: CustomEvent<string[]>) =>
                    (selectedReference!.editors = e.detail)}
                  placeholder="Add editors"
                />
              </div>
            {/if}

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label.Root>Publisher</Label.Root>
                <Input
                  bind:value={selectedReference.publisher_name}
                  placeholder="Publisher name"
                />
              </div>
              {#if selectedReference.type?.value !== "Conference Presentation"}
                <div class="space-y-2">
                  <Label.Root>Year</Label.Root>
                  <Input
                    bind:value={selectedReference.publish_year}
                    placeholder="Publication year"
                  />
                </div>
              {:else}
                <div class="space-y-2">
                  <Label.Root>City</Label.Root>
                  <Input
                    bind:value={selectedReference.city}
                    placeholder="City"
                  />
                </div>
              {/if}
            </div>

            {#if selectedReference.type?.value !== "Book" && selectedReference.type?.value !== "Book Chapter" && selectedReference.type?.value !== "Conference Presentation"}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label.Root>Volume</Label.Root>
                  <Input
                    bind:value={selectedReference.volume}
                    placeholder="Volume number"
                  />
                </div>
                <div class="space-y-2">
                  <Label.Root>Issue</Label.Root>
                  <Input
                    bind:value={selectedReference.issue}
                    placeholder="Issue number"
                  />
                </div>
              </div>
            {/if}

            {#if selectedReference.type?.value !== "Book" && selectedReference.type?.value !== "Conference Presentation"}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label.Root>Start Page</Label.Root>
                  <Input
                    bind:value={selectedReference.start_page}
                    placeholder="Start page"
                  />
                </div>
                <div class="space-y-2">
                  <Label.Root>End Page</Label.Root>
                  <Input
                    bind:value={selectedReference.end_page}
                    placeholder="End page"
                  />
                </div>
              </div>
            {/if}

            {#if selectedReference.type?.value === "Conference Presentation"}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label.Root>Start Date</Label.Root>
                  <Input
                    type="date"
                    bind:value={selectedReference.start_date}
                  />
                </div>
                <div class="space-y-2">
                  <Label.Root>End Date</Label.Root>
                  <Input type="date" bind:value={selectedReference.end_date} />
                </div>
              </div>
            {/if}

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label.Root>Type</Label.Root>
                <Select.Root
                  type="single"
                  value={selectedReference.type.value}
                  onValueChange={(value) => onTypeChange(value)}
                >
                  <Select.Trigger>
                    <span>{selectedReference.type.label}</span>
                  </Select.Trigger>
                  <Select.Content>
                    {#each literatureTypes as type}
                      <Select.Item value={type.value} label={type.label}>
                        {#snippet children({ selected })}
                          {type.label}
                          {#if selected}
                            <div class="ml-auto">✓</div>
                          {/if}
                        {/snippet}
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
              <div class="space-y-2">
                <Label.Root>Link</Label.Root>
                <Input
                  bind:value={selectedReference.link}
                  placeholder="URL to literature"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t p-4 flex justify-end gap-2">
          <Dialog.Close class={buttonVariants({ variant: "outline" })}
            >Cancel</Dialog.Close
          >
          <Button
            onclick={() => {
              // Update the status based on required fields
              if (selectedReference) {
                selectedReference.status =
                  selectedReference.name &&
                  selectedReference.authors?.length > 0
                    ? "success"
                    : "failure";
              }
              // Update the reference in the extractedReferences array
              extractedReferences = extractedReferences.map((ref) =>
                ref === selectedReference ? selectedReference : ref
              );
              // Close the edit dialog
              selectedReference = null;
            }}>Update Reference</Button
          >
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{/if}

<style>
  /* Add any custom styles here */
</style>
