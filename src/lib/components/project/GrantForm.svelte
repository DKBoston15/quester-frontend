<!-- src/lib/components/project/GrantForm.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Select from "$lib/components/ui/select";
  import * as Card from "$lib/components/ui/card";
  import { Loader2Icon, XIcon } from "lucide-svelte";
  import type { Grant } from "$lib/types/auth";

  interface Props {
    grant?: Grant | null;
    onSave: (data: Partial<Grant>) => void;
    onCancel: () => void;
    isLoading?: boolean;
  }

  let { grant = null, onSave, onCancel, isLoading = false }: Props = $props();

  let formData = $state({
    grantName: grant?.grantName || "",
    recipient: grant?.recipient || "",
    awardNumber: grant?.awardNumber || "",
    startDate: grant?.startDate || "",
    endDate: grant?.endDate || "",
    awardType: grant?.awardType || "",
    directorateDivision: grant?.directorateDivision || "",
    principalInvestigator: grant?.principalInvestigator || "",
    coPrincipalInvestigator: grant?.coPrincipalInvestigator || "",
    programManager: grant?.programManager || "",
    amount: grant?.amount?.toString() || "",
    status: grant?.status || "active",
  });

  let errors = $state<Record<string, string>>({});

  const awardTypeOptions = [
    { value: "research", label: "Research Grant" },
    { value: "training", label: "Training Grant" },
    { value: "equipment", label: "Equipment Grant" },
    { value: "fellowship", label: "Fellowship" },
    { value: "career", label: "Career Development" },
    { value: "collaborative", label: "Collaborative Research" },
    { value: "other", label: "Other" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "expired", label: "Expired" },
  ];

  function validateForm() {
    errors = {};

    if (!formData.grantName.trim()) {
      errors.grantName = "Grant name is required";
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        errors.endDate = "End date must be after start date";
      }
    }

    if (formData.amount && isNaN(Number(formData.amount))) {
      errors.amount = "Amount must be a valid number";
    }

    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) return;

    const submitData: Partial<Grant> = {
      grantName: formData.grantName.trim(),
      recipient: formData.recipient.trim() || null,
      awardNumber: formData.awardNumber.trim() || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      awardType: formData.awardType || null,
      directorateDivision: formData.directorateDivision.trim() || null,
      principalInvestigator: formData.principalInvestigator.trim() || null,
      coPrincipalInvestigator: formData.coPrincipalInvestigator.trim() || null,
      programManager: formData.programManager.trim() || null,
      amount: formData.amount ? Number(formData.amount) : null,
      status: formData.status,
    };

    onSave(submitData);
  }

  function handleFormSubmit(event: Event) {
    event.preventDefault();
    handleSubmit();
  }
</script>

<Card.Root
  class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Card.Header>
    <div class="flex justify-between items-center">
      <Card.Title>{grant ? "Edit Grant" : "Add New Grant"}</Card.Title>
      <Button variant="ghost" size="sm" onclick={onCancel}>
        <XIcon class="h-4 w-4" />
      </Button>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <form
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
      onsubmit={handleFormSubmit}
    >
      <!-- Grant Name -->
      <div class="md:col-span-2">
        <Label for="grantName">Grant Name *</Label>
        <Input
          id="grantName"
          bind:value={formData.grantName}
          placeholder="e.g., NSF Career Development Award"
          class={errors.grantName ? "border-destructive" : ""}
        />
        {#if errors.grantName}
          <p class="text-sm text-destructive mt-1">{errors.grantName}</p>
        {/if}
      </div>

      <!-- Recipient -->
      <div>
        <Label for="recipient">Recipient</Label>
        <Input
          id="recipient"
          bind:value={formData.recipient}
          placeholder="e.g., University of California"
        />
      </div>

      <!-- Award Number -->
      <div>
        <Label for="awardNumber">Award Number</Label>
        <Input
          id="awardNumber"
          bind:value={formData.awardNumber}
          placeholder="e.g., NSF-2023-001"
        />
      </div>

      <!-- Start Date -->
      <div>
        <Label for="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          bind:value={formData.startDate}
          class={errors.startDate ? "border-destructive" : ""}
        />
        {#if errors.startDate}
          <p class="text-sm text-destructive mt-1">{errors.startDate}</p>
        {/if}
      </div>

      <!-- End Date -->
      <div>
        <Label for="endDate">End Date</Label>
        <Input
          id="endDate"
          type="date"
          bind:value={formData.endDate}
          class={errors.endDate ? "border-destructive" : ""}
        />
        {#if errors.endDate}
          <p class="text-sm text-destructive mt-1">{errors.endDate}</p>
        {/if}
      </div>

      <!-- Award Type -->
      <div>
        <Label for="awardType">Award Type</Label>
        <Select.Root bind:value={formData.awardType} type="single">
          <Select.Trigger>
            <span class="truncate">
              {awardTypeOptions.find((opt) => opt.value === formData.awardType)
                ?.label || "Select award type"}
            </span>
          </Select.Trigger>
          <Select.Content>
            {#each awardTypeOptions as option}
              <Select.Item value={option.value}>
                {option.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Status -->
      <div>
        <Label for="status">Status</Label>
        <Select.Root bind:value={formData.status} type="single">
          <Select.Trigger>
            <span class="truncate">
              {statusOptions.find((opt) => opt.value === formData.status)
                ?.label || "Select status"}
            </span>
          </Select.Trigger>
          <Select.Content>
            {#each statusOptions as option}
              <Select.Item value={option.value}>
                {option.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Directorate/Division -->
      <div>
        <Label for="directorateDivision">Directorate/Division</Label>
        <Input
          id="directorateDivision"
          bind:value={formData.directorateDivision}
          placeholder="e.g., Engineering Directorate"
        />
      </div>

      <!-- Amount -->
      <div>
        <Label for="amount">Amount ($)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          bind:value={formData.amount}
          placeholder="e.g., 500000"
          class={errors.amount ? "border-destructive" : ""}
        />
        {#if errors.amount}
          <p class="text-sm text-destructive mt-1">{errors.amount}</p>
        {/if}
      </div>

      <!-- Principal Investigator -->
      <div>
        <Label for="principalInvestigator">Principal Investigator</Label>
        <Input
          id="principalInvestigator"
          bind:value={formData.principalInvestigator}
          placeholder="e.g., Dr. Jane Smith"
        />
      </div>

      <!-- Co-Principal Investigator -->
      <div>
        <Label for="coPrincipalInvestigator">Co-Principal Investigator</Label>
        <Input
          id="coPrincipalInvestigator"
          bind:value={formData.coPrincipalInvestigator}
          placeholder="e.g., Dr. John Doe"
        />
      </div>

      <!-- Program Manager -->
      <div>
        <Label for="programManager">Program Manager</Label>
        <Input
          id="programManager"
          bind:value={formData.programManager}
          placeholder="e.g., Dr. Program Manager"
        />
      </div>
    </form>
  </Card.Content>

  <Card.Footer class="flex justify-end gap-2">
    <Button variant="outline" onclick={onCancel} disabled={isLoading}>
      Cancel
    </Button>
    <Button onclick={handleSubmit} disabled={isLoading}>
      {#if isLoading}
        <Loader2Icon class="h-4 w-4 animate-spin mr-2" />
      {/if}
      {grant ? "Update Grant" : "Add Grant"}
    </Button>
  </Card.Footer>
</Card.Root>
