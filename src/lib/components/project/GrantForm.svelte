<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import * as Card from "$lib/components/ui/card";
  import { Loader2Icon, XIcon, PlusIcon, MinusIcon } from "lucide-svelte";
  import type { Grant } from "$lib/types/auth";
  import { _ } from "$lib/i18n";

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
    { value: "standard", label: $_("grants.types.standard") },
    { value: "research", label: $_("grants.types.research") },
    { value: "training", label: $_("grants.types.training") },
    { value: "equipment", label: $_("grants.types.equipment") },
    { value: "fellowship", label: $_("grants.types.fellowship") },
    { value: "career", label: $_("grants.types.career") },
    { value: "collaborative", label: $_("grants.types.collaborative") },
    { value: "other", label: $_("grants.types.other") },
  ];

  const statusOptions = [
    { value: "active", label: $_("grants.status.active") },
    { value: "pending", label: $_("grants.status.pending") },
    { value: "completed", label: $_("grants.status.completed") },
    { value: "cancelled", label: $_("grants.status.cancelled") },
    { value: "expired", label: $_("grants.status.expired") },
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
      errors.grantName = $_("grants.validation.grantNameRequired");
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        errors.endDate = $_("grants.validation.endDateAfterStart");
      }
    }

    if (formData.amount && isNaN(Number(formData.amount))) {
      errors.amount = $_("grants.validation.amountMustBeNumber");
    }

    if (formData.programManagerEmail && formData.programManagerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.programManagerEmail.trim())) {
        errors.programManagerEmail = $_("grants.validation.invalidEmail");
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

<Card.Root
  class="border-2 dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Card.Header>
    <div class="flex justify-between items-center">
      <Card.Title>{grant ? $_("grants.form.editGrant") : $_("grants.form.addNewGrant")}</Card.Title>
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
        <Label for="grantName">{$_("grants.form.title")}</Label>
        <Input
          id="grantName"
          bind:value={formData.grantName}
          placeholder={$_("grants.form.titlePlaceholder")}
          class={errors.grantName ? "border-destructive" : ""}
        />
        {#if errors.grantName}
          <p class="text-sm text-destructive mt-1">{errors.grantName}</p>
        {/if}
      </div>

      <!-- Recipient -->
      <div>
        <Label for="recipient">{$_("grants.form.recipient")}</Label>
        <Input
          id="recipient"
          bind:value={formData.recipient}
          placeholder={$_("grants.form.recipientPlaceholder")}
        />
      </div>

      <!-- Award Number -->
      <div>
        <Label for="awardNumber">{$_("grants.form.awardNumber")}</Label>
        <Input
          id="awardNumber"
          bind:value={formData.awardNumber}
          placeholder={$_("grants.form.awardNumberPlaceholder")}
        />
      </div>

      <!-- Start Date -->
      <div>
        <Label for="startDate">{$_("grants.form.startDate")}</Label>
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
        <Label for="endDate">{$_("grants.form.endDate")}</Label>
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
        <Label for="awardType">{$_("grants.form.awardInstrument")}</Label>
        <Select.Root bind:value={formData.awardType} type="single">
          <Select.Trigger>
            <span class="truncate">
              {awardInstrumentOptions.find(
                (opt) => opt.value === formData.awardType
              )?.label || $_("grants.form.selectAwardInstrument")}
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
        <Label for="status">{$_("grants.form.statusLabel")}</Label>
        <Select.Root bind:value={formData.status} type="single">
          <Select.Trigger>
            <span class="truncate">
              {statusOptions.find((opt) => opt.value === formData.status)
                ?.label || $_("grants.form.selectStatus")}
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
        <Label for="directorateDivision">{$_("grants.form.directorateDivision")}</Label>
        <Input
          id="directorateDivision"
          bind:value={formData.directorateDivision}
          placeholder={$_("grants.form.directorateDivisionPlaceholder")}
        />
      </div>

      <!-- Amount -->
      <div>
        <Label for="amount">{$_("grants.form.amountLabel")}</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          bind:value={formData.amount}
          placeholder={$_("grants.form.amountPlaceholder")}
          class={errors.amount ? "border-destructive" : ""}
        />
        {#if errors.amount}
          <p class="text-sm text-destructive mt-1">{errors.amount}</p>
        {/if}
      </div>

      <!-- Principal Investigators -->
      <div class="md:col-span-2">
        <div class="flex justify-between items-center mb-2">
          <Label>{$_("grants.form.principalInvestigators")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={addPrincipalInvestigator}
          >
            <PlusIcon class="h-4 w-4 mr-1" />
            {$_("grants.form.addPI")}
          </Button>
        </div>
        {#each formData.principalInvestigators as pi, index}
          <div class="flex gap-2 mb-2">
            <Input
              bind:value={formData.principalInvestigators[index]}
              placeholder={$_("grants.form.piPlaceholder")}
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
          <Label>{$_("grants.form.coPrincipalInvestigators")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={addCoPrincipalInvestigator}
          >
            <PlusIcon class="h-4 w-4 mr-1" />
            {$_("grants.form.addCoPI")}
          </Button>
        </div>
        {#each formData.coPrincipalInvestigators as copi, index}
          <div class="flex gap-2 mb-2">
            <Input
              bind:value={formData.coPrincipalInvestigators[index]}
              placeholder={$_("grants.form.copiPlaceholder")}
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
        <Label for="programManager">{$_("grants.form.programManager")}</Label>
        <Input
          id="programManager"
          bind:value={formData.programManager}
          placeholder={$_("grants.form.programManagerPlaceholder")}
        />
      </div>

      <!-- Program Manager Email -->
      <div>
        <Label for="programManagerEmail">{$_("grants.form.programManagerEmail")}</Label>
        <Input
          id="programManagerEmail"
          type="email"
          bind:value={formData.programManagerEmail}
          placeholder={$_("grants.form.programManagerEmailPlaceholder")}
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
        <Label for="programManagerPhone">{$_("grants.form.programManagerPhone")}</Label>
        <Input
          id="programManagerPhone"
          type="tel"
          bind:value={formData.programManagerPhone}
          placeholder={$_("grants.form.programManagerPhonePlaceholder")}
        />
      </div>
    </form>
  </Card.Content>

  <Card.Footer class="flex justify-end gap-2">
    <Button variant="outline" onclick={onCancel} disabled={isLoading}>
      {$_("common.cancel")}
    </Button>
    <Button onclick={handleSubmit} disabled={isLoading}>
      {#if isLoading}
        <Loader2Icon class="h-4 w-4 animate-spin mr-2" />
      {/if}
      {grant ? $_("grants.form.updateGrant") : $_("grants.form.addGrant")}
    </Button>
  </Card.Footer>
</Card.Root>
