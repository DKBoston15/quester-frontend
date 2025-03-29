<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox";
  import Label from "$lib/components/ui/label/label.svelte";
  import { typeMap } from "./data";

  type TypeMapKey = keyof typeof typeMap;

  export let type: TypeMapKey;
  export let checked: boolean;
  export let onToggle: (type: TypeMapKey) => void;
  export let color: string;
</script>

<div
  class="flex items-center space-x-4 w-full justify-between dark:bg-[#1F2024]"
>
  <Label class="text-lg">{typeMap[type]}</Label>
  <Checkbox {checked} {color} onCheckedChange={() => onToggle(type)} />
</div>
