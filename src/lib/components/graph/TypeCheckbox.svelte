<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox";
  import Label from "$lib/components/ui/label/label.svelte";
  import { getTypeLabel, nodeTypes } from "./data";

  type NodeType = (typeof nodeTypes)[number];

  export let type: NodeType;
  export let checked: boolean;
  export let onToggle: (type: NodeType) => void;
  export let color: string;
</script>

<div
  class="flex items-center space-x-4 w-full justify-between dark:bg-[#1F2024]"
>
  <Label class="text-lg">{getTypeLabel(type)}</Label>
  <Checkbox {checked} {color} onCheckedChange={() => onToggle(type)} />
</div>
