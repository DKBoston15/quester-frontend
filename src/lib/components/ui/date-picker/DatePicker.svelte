<script lang="ts">
  import { Calendar } from "../calendar";
  import * as Popover from "../popover";
  import { Button } from "../button";
  import { CalendarDays } from "lucide-svelte";
  import { cn } from "$lib/utils";

  interface Props {
    value?: Date;
    placeholder?: string;
    class?: string;
  }

  let {
    value = $bindable(),
    placeholder = "Select date",
    class: className = "",
  }: Props = $props();

  let open = $state(false);

  function formatDate(date: Date | undefined): string {
    if (!date) return placeholder;
    return date.toLocaleDateString();
  }

  function handleDateChange() {
    open = false;
  }

  $effect(() => {
    if (value) {
      handleDateChange();
    }
  });
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    <Button
      variant="outline"
      class={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
    >
      <CalendarDays class="mr-2 h-4 w-4" />
      {formatDate(value)}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar bind:value />
  </Popover.Content>
</Popover.Root>
