<script>
  import { Checkbox } from "$lib/components/ui/checkbox";
  import Label from "$lib/components/ui/label/label.svelte";
  import { typeMap } from "./data";

  export let type;
  export let checked;
  export let onToggle;
  export let color;
</script>

<div class="flex items-center space-x-4 w-full justify-between">
  <Label class="text-lg">{typeMap[type]}</Label>
  <Checkbox {checked} {color} onCheckedChange={() => onToggle(type)} />
</div>
