<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import * as Card from "$lib/components/ui/card";
  import { Loader2Icon, XIcon, PlusIcon, MinusIcon } from "lucide-svelte";
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
    principalInvestigators: grant?.principalInvestigators || [""],
    coPrincipalInvestigators: grant?.coPrincipalInvestigators || [""],
    programManager: grant?.programManager || "",
    programManagerEmail: grant?.programManagerEmail || "",
    programManagerPhone: grant?.programManagerPhone || "",
    amount: grant?.amount?.toString() || "",
    status: grant?.status || "active",
  });

  let errors = $state<Record<string, string>>({});

  const awardInstrumentOptions = [
    { value: "standard", label: "Standard Grant" },
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

  function addPrincipalInvestigator() {
    formData.principalInvestigators = [...formData.principalInvestigators, ""];
  }

  function removePrincipalInvestigator(index: number) {
    if (formData.principalInvestigators.length > 1) {
      formData.principalInvestigators = formData.principalInvestigators.filter(
        (_, i) => i !== index
      );
    }
  }

  function addCoPrincipalInvestigator() {
    formData.coPrincipalInvestigators = [
      ...formData.coPrincipalInvestigators,
      "",
    ];
  }

  function removeCoPrincipalInvestigator(index: number) {
    if (formData.coPrincipalInvestigators.length > 1) {
      formData.coPrincipalInvestigators =
        formData.coPrincipalInvestigators.filter((_, i) => i !== index);
    }
  }

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

    if (formData.programManagerEmail && formData.programManagerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.programManagerEmail.trim())) {
        errors.programManagerEmail = "Must be a valid email address";
      }
    }

    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) return;

    // Filter out empty PIs and Co-PIs
    const filteredPIs = formData.principalInvestigators.filter(
      (pi) => pi.trim().length > 0
    );
    const filteredCoPIs = formData.coPrincipalInvestigators.filter(
      (copi) => copi.trim().length > 0
    );

    const submitData: Partial<Grant> = {
      grantName: formData.grantName.trim(),
      recipient: formData.recipient.trim() || null,
      awardNumber: formData.awardNumber.trim() || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      awardType: formData.awardType || null,
      directorateDivision: formData.directorateDivision.trim() || null,
      principalInvestigators: filteredPIs.length > 0 ? filteredPIs : null,
      coPrincipalInvestigators: filteredCoPIs.length > 0 ? filteredCoPIs : null,
      programManager: formData.programManager.trim() || null,
      programManagerEmail: formData.programManagerEmail.trim() || null,
      programManagerPhone: formData.programManagerPhone.trim() || null,
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

<Card.Root>
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

      <!-- Award Instrument -->
      <div>
        <Label for="awardType">Award Instrument</Label>
        <Select.Root bind:value={formData.awardType} type="single">
          <Select.Trigger>
            <span class="truncate">
              {awardInstrumentOptions.find(
                (opt) => opt.value === formData.awardType
              )?.label || "Select award instrument"}
            </span>
          </Select.Trigger>
          <Select.Content>
            {#each awardInstrumentOptions as option}
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

      <!-- Principal Investigators -->
      <div class="md:col-span-2">
        <div class="flex justify-between items-center mb-2">
          <Label>Principal Investigators</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={addPrincipalInvestigator}
          >
            <PlusIcon class="h-4 w-4 mr-1" />
            Add PI
          </Button>
        </div>
        {#each formData.principalInvestigators as pi, index}
          <div class="flex gap-2 mb-2">
            <Input
              bind:value={formData.principalInvestigators[index]}
              placeholder="e.g., Dr. Jane Smith"
              class="flex-1"
            />
            {#if formData.principalInvestigators.length > 1}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={() => removePrincipalInvestigator(index)}
              >
                <MinusIcon class="h-4 w-4" />
              </Button>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Co-Principal Investigators -->
      <div class="md:col-span-2">
        <div class="flex justify-between items-center mb-2">
          <Label>Co-Principal Investigators</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={addCoPrincipalInvestigator}
          >
            <PlusIcon class="h-4 w-4 mr-1" />
            Add Co-PI
          </Button>
        </div>
        {#each formData.coPrincipalInvestigators as copi, index}
          <div class="flex gap-2 mb-2">
            <Input
              bind:value={formData.coPrincipalInvestigators[index]}
              placeholder="e.g., Dr. John Doe"
              class="flex-1"
            />
            {#if formData.coPrincipalInvestigators.length > 1}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={() => removeCoPrincipalInvestigator(index)}
              >
                <MinusIcon class="h-4 w-4" />
              </Button>
            {/if}
          </div>
        {/each}
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

      <!-- Program Manager Email -->
      <div>
        <Label for="programManagerEmail">Program Manager Email</Label>
        <Input
          id="programManagerEmail"
          type="email"
          bind:value={formData.programManagerEmail}
          placeholder="e.g., pm@nsf.gov"
          class={errors.programManagerEmail ? "border-destructive" : ""}
        />
        {#if errors.programManagerEmail}
          <p class="text-sm text-destructive mt-1">
            {errors.programManagerEmail}
          </p>
        {/if}
      </div>

      <!-- Program Manager Phone -->
      <div class="md:col-span-2">
        <Label for="programManagerPhone">Program Manager Phone</Label>
        <Input
          id="programManagerPhone"
          type="tel"
          bind:value={formData.programManagerPhone}
          placeholder="e.g., (555) 123-4567"
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
