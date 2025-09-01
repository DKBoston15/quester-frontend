<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { createEventDispatcher } from "svelte";
  import { Badge } from "$lib/components/ui/badge";
  import TagInput from "../../TagInput.svelte";
  import CalendarIcon from "lucide-svelte/icons/calendar";
  import { DateFormatter } from "@internationalized/date";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { InfoIcon } from "lucide-svelte";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import type { Literature } from "$lib/types/literature";
  import { format, parse } from "date-fns";

  const dispatch = createEventDispatcher();
  const { literature: propLiterature } = $props<{ literature?: Literature }>();

  let literatureBackup = $state<Literature | null>(null);
  let editMode = $state({ details: false, cancel: false });

  let literature = $state(
    propLiterature
      ? JSON.parse(JSON.stringify(propLiterature))
      : {
          id: "",
          name: "",
          secondName: "",
          authors: [],
          chapterTitle: "",
          link: "",
          issue: "",
          volume: "",
          editors: [],
          publishYear: "",
          publisherName: "",
          type: { value: "", label: "" },
          startPage: "",
          endPage: "",
          startDate: "",
          endDate: "",
          city: "",
        }
  );

  let editingLiterature = $state<Literature>(
    JSON.parse(JSON.stringify(literature))
  );

  // Ensure authors and editors are always arrays
  $effect(() => {
    if (typeof editingLiterature.authors === "string") {
      try {
        editingLiterature.authors = JSON.parse(
          editingLiterature.authors
        ) as string[];
      } catch (e) {
        editingLiterature.authors = [];
      }
    } else if (!Array.isArray(editingLiterature.authors)) {
      editingLiterature.authors = [];
    }

    if (typeof editingLiterature.editors === "string") {
      try {
        editingLiterature.editors = JSON.parse(
          editingLiterature.editors
        ) as string[];
      } catch (e) {
        editingLiterature.editors = [];
      }
    } else if (!Array.isArray(editingLiterature.editors)) {
      editingLiterature.editors = [];
    }
  });

  let selectedType = $state(literature?.type || "");

  const df = new DateFormatter("en-US", { dateStyle: "long" });

  let startDateValue = $state(
    literature.startDate ? new Date(literature.startDate) : undefined
  );
  let endDateValue = $state(
    literature.endDate ? new Date(literature.endDate) : undefined
  );

  // Only run this effect when propLiterature changes
  $effect.root(() => {
    if (!propLiterature) return;

    // Create a new copy of the literature object
    const newLiterature = JSON.parse(JSON.stringify(propLiterature));

    // Handle authors
    if (typeof newLiterature.authors === "string") {
      try {
        const parsedAuthors = JSON.parse(newLiterature.authors);
        newLiterature.authors = Array.isArray(parsedAuthors)
          ? parsedAuthors
          : [newLiterature.authors];
      } catch (e) {
        // If JSON.parse fails, treat the string as a single author
        console.error("Error parsing authors:", e);
        newLiterature.authors = [newLiterature.authors];
      }
    } else if (!Array.isArray(newLiterature.authors)) {
      newLiterature.authors = [];
    }

    // Handle editors
    if (typeof newLiterature.editors === "string") {
      try {
        const parsedEditors = JSON.parse(newLiterature.editors);
        newLiterature.editors = Array.isArray(parsedEditors)
          ? parsedEditors
          : [newLiterature.editors];
      } catch (e) {
        // If JSON.parse fails, treat the string as a single editor
        console.error("Error parsing editors:", e);
        newLiterature.editors = [newLiterature.editors];
      }
    } else if (!Array.isArray(newLiterature.editors)) {
      newLiterature.editors = [];
    }

    // Update literature
    literature = newLiterature;
    editingLiterature = JSON.parse(JSON.stringify(newLiterature));
    selectedType = newLiterature.type || "";
  });

  function enterEditMode() {
    literatureBackup = JSON.parse(JSON.stringify(literature));
    editingLiterature = JSON.parse(JSON.stringify(literature));
    editMode.details = true;
  }

  function cancelEdit() {
    if (literatureBackup) {
      literature = JSON.parse(JSON.stringify(literatureBackup));
      editingLiterature = JSON.parse(JSON.stringify(literatureBackup));
      literatureBackup = null;
      selectedType = literature.type || "";
    }
    editMode.details = false;
    editMode.cancel = true;
  }

  async function updateField() {
    try {
      const dataToUpdate: Partial<Literature> = {};

      // Only include fields that have values
      if (editingLiterature.name?.trim())
        dataToUpdate.name = editingLiterature.name;
      if (
        Array.isArray(editingLiterature.authors) &&
        editingLiterature.authors.length > 0
      ) {
        dataToUpdate.authors = JSON.stringify(editingLiterature.authors);
      }
      if (editingLiterature.chapterTitle?.trim())
        dataToUpdate.chapterTitle = editingLiterature.chapterTitle;
      if (editingLiterature.secondName?.trim())
        dataToUpdate.secondName = editingLiterature.secondName;
      if (editingLiterature.city?.trim())
        dataToUpdate.city = editingLiterature.city;
      if (editingLiterature.link?.trim())
        dataToUpdate.link = editingLiterature.link;
      if (editingLiterature.issue?.trim())
        dataToUpdate.issue = editingLiterature.issue;
      if (editingLiterature.volume?.trim())
        dataToUpdate.volume = editingLiterature.volume;
      if (
        Array.isArray(editingLiterature.editors) &&
        editingLiterature.editors.length > 0
      ) {
        dataToUpdate.editors = JSON.stringify(editingLiterature.editors);
      }
      if (editingLiterature.publishYear?.trim())
        dataToUpdate.publishYear = editingLiterature.publishYear;
      if (editingLiterature.publisherName?.trim())
        dataToUpdate.publisherName = editingLiterature.publisherName;
      if (selectedType) dataToUpdate.type = selectedType;
      if (editingLiterature.startPage?.trim())
        dataToUpdate.startPage = editingLiterature.startPage;
      if (editingLiterature.endPage?.trim())
        dataToUpdate.endPage = editingLiterature.endPage;
      if (startDateValue) dataToUpdate.startDate = startDateValue.toString();
      if (endDateValue) dataToUpdate.endDate = endDateValue.toString();

      // For empty fields, explicitly set them to empty strings
      if (!editingLiterature.name?.trim()) dataToUpdate.name = "";
      if (
        !Array.isArray(editingLiterature.authors) ||
        editingLiterature.authors.length === 0
      ) {
        dataToUpdate.authors = "[]";
      }
      if (!editingLiterature.chapterTitle?.trim())
        dataToUpdate.chapterTitle = "";
      if (!editingLiterature.secondName?.trim()) dataToUpdate.secondName = "";
      if (!editingLiterature.city?.trim()) dataToUpdate.city = "";
      if (!editingLiterature.link?.trim()) dataToUpdate.link = "";
      if (!editingLiterature.issue?.trim()) dataToUpdate.issue = "";
      if (!editingLiterature.volume?.trim()) dataToUpdate.volume = "";
      if (
        !Array.isArray(editingLiterature.editors) ||
        editingLiterature.editors.length === 0
      ) {
        dataToUpdate.editors = "[]";
      }
      if (!editingLiterature.publishYear?.trim()) dataToUpdate.publishYear = "";
      if (!editingLiterature.publisherName?.trim())
        dataToUpdate.publisherName = "";
      if (!editingLiterature.startPage?.trim()) dataToUpdate.startPage = "";
      if (!editingLiterature.endPage?.trim()) dataToUpdate.endPage = "";
      if (!startDateValue) dataToUpdate.startDate = "";
      if (!endDateValue) dataToUpdate.endDate = "";

      const response = await literatureStore.updateLiterature(
        literature.id,
        dataToUpdate
      );

      // Create a new copy of the response data
      const updatedLiterature = JSON.parse(JSON.stringify(response.literature));

      // Parse authors if it's a string
      if (typeof updatedLiterature.authors === "string") {
        try {
          updatedLiterature.authors = JSON.parse(updatedLiterature.authors);
        } catch (e) {
          console.error("Error parsing authors from response:", e);
          updatedLiterature.authors = [updatedLiterature.authors];
        }
      }

      // Parse editors if it's a string
      if (typeof updatedLiterature.editors === "string") {
        try {
          updatedLiterature.editors = JSON.parse(updatedLiterature.editors);
        } catch (e) {
          console.error("Error parsing editors from response:", e);
          updatedLiterature.editors = [updatedLiterature.editors];
        }
      }

      // Update the local state with parsed data
      literature = updatedLiterature;
      editingLiterature = JSON.parse(JSON.stringify(updatedLiterature));
      editMode.details = false;

      // Dispatch the updated literature to the parent
      dispatch("update", { literature: updatedLiterature });
    } catch (error) {
      console.error("Error updating literature:", error);
    }
  }

  function handleTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedType = target.value;
    editingLiterature.type = target.value;
  }
</script>

<div class="grid gap-6">
  <div class="grid gap-3" id="lit-detail-title-section">
    <Label for="name">
      {#if selectedType === "Book Chapter"}
        Book
      {:else if selectedType === "Conference Presentation"}
        Presentation Title
      {:else}
        Title
      {/if}
    </Label>
    {#if editMode.details}
      <Input
        id="name"
        type="text"
        bind:value={editingLiterature.name}
        placeholder="Title"
      />
    {:else}
      <p class="break-words">{literature.name || ""}</p>
    {/if}
  </div>

  {#if selectedType === "Book Chapter" || selectedType === "Conference Presentation"}
    <div class="grid gap-3">
      <Label
        for={selectedType === "Book Chapter" ? "chapterTitle" : "secondName"}
      >
        {#if selectedType === "Book Chapter"}
          Chapter Title
        {:else if selectedType === "Conference Presentation"}
          Conference Name
        {/if}
      </Label>
      {#if editMode.details}
        {#if selectedType === "Book Chapter"}
          <Input
            id="chapterTitle"
            type="text"
            bind:value={editingLiterature.chapterTitle}
            placeholder="Chapter Title"
          />
        {:else}
          <Input
            id="secondName"
            type="text"
            bind:value={editingLiterature.secondName}
            placeholder="Second Name"
          />
        {/if}
      {:else}
        <p>
          {selectedType === "Book Chapter"
            ? literature.chapterTitle || ""
            : literature.secondName || ""}
        </p>
      {/if}
    </div>
  {/if}

  <div class="grid gap-3" id="lit-detail-authors-section">
    <div class="flex space-x-2 items-center">
      <Tooltip.Root>
        <Tooltip.Trigger>
          <InfoIcon class="w-5 h-5" />
        </Tooltip.Trigger>
        <Tooltip.Content class="max-w-[20rem]">
          <p>
            We highly recommend using the following format for authors: Last
            Name, First Initial <br />
            EX: <b>Smith, J or Stanley, R</b>
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
      <Label for="authors">Authors</Label>
    </div>

    {#if editMode.details}
      <TagInput
        tags={(Array.isArray(editingLiterature.authors)
          ? editingLiterature.authors
          : []) as string[]}
        on:change={(e) => (editingLiterature.authors = e.detail.tags)}
        placeholder="Authors"
      />
    {:else}
      <div class="flex flex-wrap">
        {#each literature.authors as author}
          <Badge class="flex items-center m-1 p-2 rounded-md"
            >{author.trim()}</Badge
          >
        {/each}
      </div>
    {/if}
  </div>

  {#if selectedType === "Book Chapter"}
    <div class="grid gap-3">
      <Label for="editors">Editors</Label>
      {#if editMode.details}
        <TagInput
          tags={(Array.isArray(editingLiterature.editors)
            ? editingLiterature.editors
            : []) as string[]}
          on:change={(e) => (editingLiterature.editors = e.detail.tags)}
          placeholder="Editors"
        />
      {:else}
        <div class="flex flex-wrap">
          {#each literature.editors as editor}
            <Badge class="flex items-center m-1 p-2 rounded-md"
              >{editor.trim()}</Badge
            >
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-4">
    <div class="grid gap-3" id="lit-detail-publisher-section">
      <Label for="publisherName">Publisher</Label>
      {#if editMode.details}
        <Input
          id="publisherName"
          type="text"
          bind:value={editingLiterature.publisherName}
          placeholder="Publisher"
        />
      {:else}
        <p>{literature.publisherName || ""}</p>
      {/if}
    </div>
    {#if selectedType !== "Conference Presentation"}
      <div class="grid gap-3" id="lit-detail-year-section">
        <Label for="publishYear">Publish Year</Label>
        {#if editMode.details}
          <Input
            id="publishYear"
            type="text"
            bind:value={editingLiterature.publishYear}
            placeholder="Publish Year"
          />
        {:else}
          <p>{literature.publishYear || ""}</p>
        {/if}
      </div>
    {:else}
      <div class="grid gap-3" id="lit-detail-city-section">
        <Label for="city">City</Label>
        {#if editMode.details}
          <Input
            id="city"
            type="text"
            bind:value={editingLiterature.city}
            placeholder="City"
          />
        {:else}
          <p>{literature.city || ""}</p>
        {/if}
      </div>
    {/if}
  </div>

  {#if selectedType !== "Book" && selectedType !== "Book Chapter" && selectedType !== "Conference Presentation"}
    <div class="grid grid-cols-2 gap-4">
      <div class="grid gap-3">
        <Label for="volume">Volume</Label>
        {#if editMode.details}
          <Input
            id="volume"
            type="text"
            bind:value={editingLiterature.volume}
            placeholder="Volume"
          />
        {:else}
          <p>{literature.volume || ""}</p>
        {/if}
      </div>
      <div class="grid gap-3">
        <Label for="issue">Issue</Label>
        {#if editMode.details}
          <Input
            id="issue"
            type="text"
            bind:value={editingLiterature.issue}
            placeholder="Issue"
          />
        {:else}
          <p>{literature.issue || ""}</p>
        {/if}
      </div>
    </div>
  {/if}

  {#if selectedType !== "Book" && selectedType !== "Conference Presentation"}
    <div class="grid grid-cols-2 gap-4">
      <div class="grid gap-3">
        <Label for="startPage">Start Page</Label>
        {#if editMode.details}
          <Input
            id="startPage"
            type="text"
            bind:value={editingLiterature.startPage}
            placeholder="Start Page"
          />
        {:else}
          <p>{literature.startPage || ""}</p>
        {/if}
      </div>
      <div class="grid gap-3">
        <Label for="endPage">End Page</Label>
        {#if editMode.details}
          <Input
            id="endPage"
            type="text"
            bind:value={editingLiterature.endPage}
            placeholder="End Page"
          />
        {:else}
          <p>{literature.endPage || ""}</p>
        {/if}
      </div>
    </div>
  {/if}

  {#if selectedType === "Conference Presentation"}
    <div class="grid grid-cols-2 gap-4">
      <div class="grid gap-3">
        <Label for="startDate">Start Date</Label>
        {#if editMode.details}
          <div class="relative w-full">
            <Input
              type="date"
              value={startDateValue ? format(startDateValue, "yyyy-MM-dd") : ""}
              onchange={(e) => {
                const value = e.currentTarget.value;
                startDateValue = value
                  ? parse(value, "yyyy-MM-dd", new Date())
                  : undefined;
              }}
              class="pl-10 text-base"
              placeholder="Pick a start date"
            />
            <CalendarIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400"
            />
          </div>
        {:else}
          <p>
            {startDateValue ? format(startDateValue, "PPP") : ""}
          </p>
        {/if}
      </div>
      <div class="grid gap-3">
        <Label for="endDate">End Date</Label>
        {#if editMode.details}
          <div class="relative w-full">
            <Input
              type="date"
              value={endDateValue ? format(endDateValue, "yyyy-MM-dd") : ""}
              onchange={(e) => {
                const value = e.currentTarget.value;
                endDateValue = value
                  ? parse(value, "yyyy-MM-dd", new Date())
                  : undefined;
              }}
              class="pl-10 text-base"
              placeholder="Pick an end date"
            />
            <CalendarIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400"
            />
          </div>
        {:else}
          <p>
            {endDateValue ? format(endDateValue, "PPP") : ""}
          </p>
        {/if}
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-4">
    <div class="grid gap-3" id="lit-detail-type-section">
      <Label for="type">Type</Label>
      {#if editMode.details}
        <select
          id="type"
          class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          bind:value={selectedType}
          onchange={handleTypeChange}
        >
          <option value="Journal Article">Journal Article</option>
          <option value="Literature Review">Literature Review</option>
          <option value="Book">Book</option>
          <option value="Book Chapter">Book Chapter</option>
          <option value="Conference Presentation"
            >Conference Presentation</option
          >
          <option value="Conference Proceedings">Conference Proceedings</option>
          <option value="Dissertation">Dissertation</option>
          <option value="Website">Website</option>
          <option value="Gray Literature">Gray Literature</option>
          <option value="Other">Other</option>
        </select>
      {:else}
        <p>{selectedType}</p>
      {/if}
    </div>
    <div class="grid gap-3" id="lit-detail-link-section">
      <Label for="link">Link</Label>
      {#if editMode.details}
        <Input
          id="link"
          type="text"
          bind:value={editingLiterature.link}
          placeholder="Link"
        />
      {:else}
        <p>{literature.link || ""}</p>
      {/if}
    </div>
  </div>
</div>

<div class="flex justify-end space-x-2 mt-6">
  {#if editMode.details}
    <Button
      id="lit-detail-cancel-button"
      size="sm"
      variant="ghost"
      onclick={cancelEdit}>Cancel</Button
    >
    <Button id="lit-detail-save-button" size="sm" onclick={updateField}
      >Save</Button
    >
  {:else}
    <Button id="lit-detail-edit-button" size="sm" onclick={enterEditMode}
      >Edit</Button
    >
  {/if}
</div>
