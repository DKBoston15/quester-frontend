<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import * as Textarea from "$lib/components/ui/textarea";
  import { EmptyState } from "$lib/components/ui/empty-state";
  import { format } from "date-fns/format";
  import { parse } from "date-fns/parse";
  import {
    InfoIcon,
    GripVertical,
    Plus,
    Calendar as CalendarIcon,
    Pencil,
  } from "lucide-svelte";
  import type { ResearchProduct, ResearchProductType } from "$lib/types/auth";
  import { projectStore } from "$lib/stores/ProjectStore.svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";

  const productTypes: { value: ResearchProductType; label: string }[] = [
    { value: "professionalism", label: "Professionalism" },
    { value: "writing", label: "Writing" },
    { value: "analysis", label: "Analysis" },
  ];

  const statusOptions = [
    { value: "planned", label: "Planned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
  ];

  let editMode = $state(false);
  let isPending = $state(false);
  let products = $state<ResearchProduct[]>([]);
  let newProduct = $state<{
    name: string;
    type: ResearchProductType;
    status: "planned" | "in_progress" | "completed" | "archived";
    description: string;
    dueDate?: Date;
  }>({
    name: "",
    type: "professionalism",
    status: "planned",
    description: "",
    dueDate: undefined,
  });
  let editingProduct = $state<string | null>(null);

  $effect(() => {
    if (projectStore.currentProject?.product) {
      try {
        const parsedProducts = JSON.parse(projectStore.currentProject.product);
        // Ensure all products have valid IDs
        products = parsedProducts.map((p: ResearchProduct) => ({
          ...p,
          id: p.id || crypto.randomUUID(),
        }));
      } catch (error) {
        console.error("Failed to parse products:", error);
        products = [];
      }
    } else {
      products = [];
    }
  });

  function startEditing(product: ResearchProduct) {
    editingProduct = product.id;
    newProduct = {
      name: product.name,
      type: product.type,
      status: product.status,
      description: product.description || "",
      dueDate: product.dueDate,
    };
  }

  function addProduct() {
    if (!newProduct.name?.trim()) return;

    if (editingProduct) {
      // Update existing product
      products = products.map((p) =>
        p.id === editingProduct
          ? {
              ...p,
              ...newProduct,
              description: newProduct.description?.trim() || "",
            }
          : p
      );
      editingProduct = null;
    } else {
      // Add new product
      const product: ResearchProduct = {
        id: crypto.randomUUID(),
        name: newProduct.name.trim(),
        type: newProduct.type,
        status: newProduct.status,
        description: newProduct.description?.trim() || "",
        dueDate: newProduct.dueDate,
        order: products.length,
      };
      products = [...products, product];
    }

    // Reset the form
    newProduct = {
      name: "",
      type: "professionalism",
      status: "planned",
      description: "",
      dueDate: undefined,
    };
  }

  function removeProduct(id: string) {
    products = products.filter((p) => p.id !== id);
  }

  function handleDndConsider(e: CustomEvent<{ items: ResearchProduct[] }>) {
    // Ensure all items have IDs
    products = e.detail.items.map((p) => ({
      ...p,
      id: p.id || crypto.randomUUID(),
    }));
  }

  function handleDndFinalize(e: CustomEvent<{ items: ResearchProduct[] }>) {
    // Ensure all items have IDs and update order
    products = e.detail.items.map((p, i) => ({
      ...p,
      id: p.id || crypto.randomUUID(),
      order: i,
    }));
  }

  async function saveProducts() {
    if (!projectStore.currentProject?.id) return;

    isPending = true;
    try {
      await projectStore.updateProject(projectStore.currentProject.id, {
        product: JSON.stringify(products),
      });
      editMode = false;
    } catch (error) {
      console.error("Failed to update products:", error);
    } finally {
      isPending = false;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "planned":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
      case "completed":
        return "bg-green-500/20 text-green-700 dark:text-green-300";
      case "archived":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
      default:
        return "";
    }
  }

  function getTypeColor(type: ResearchProductType) {
    switch (type) {
      case "professionalism":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-300";
      case "writing":
        return "bg-pink-500/20 text-pink-700 dark:text-pink-300";
      case "analysis":
        return "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300";
      default:
        return "";
    }
  }
</script>

<Card
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)] w-full"
>
  <CardHeader>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <CardTitle class=" text-xl">Project Products</CardTitle>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <InfoIcon class="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class=" text-sm max-w-xs">
              Manage your research outputs and deliverables.
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
      {#if !editMode}
        <Button
          size="sm"
          onclick={() => {
            editMode = true;
            newProduct = {
              name: "",
              type: "professionalism",
              status: "planned",
              description: "",
              dueDate: undefined,
            };
          }}>Edit</Button
        >
      {/if}
    </div>
  </CardHeader>

  <CardContent class="space-y-6">
    {#if editMode}
      <!-- Add New Product Form -->
      <div class="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <h3 class=" font-bold flex items-center gap-2 text-lg">
          {#if editingProduct}
            <Pencil class="h-5 w-5" />
            Edit Product
          {:else}
            <Plus class="h-5 w-5" />
            Add New Product
          {/if}
        </h3>
        <div class="grid gap-4">
          <div class="grid grid-cols-2 gap-4">
            <Input
              value={newProduct.name}
              oninput={(e) => (newProduct.name = e.currentTarget.value)}
              placeholder="Product name"
              class=" text-base"
            />
            <div class="relative w-full">
              <Input
                type="date"
                value={newProduct.dueDate
                  ? format(newProduct.dueDate, "yyyy-MM-dd")
                  : ""}
                onchange={(e) => {
                  const value = e.currentTarget.value;
                  newProduct.dueDate = value
                    ? parse(value, "yyyy-MM-dd", new Date())
                    : undefined;
                }}
                class="pl-10  text-base"
                placeholder="Pick a due date"
              />
              <CalendarIcon
                class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <select
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newProduct.type}
              onchange={(e) =>
                (newProduct.type = e.currentTarget
                  .value as ResearchProductType)}
            >
              {#each productTypes as type (type.value)}
                <option value={type.value}>{type.label}</option>
              {/each}
            </select>
            <select
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newProduct.status}
              onchange={(e) =>
                (newProduct.status = e.currentTarget.value as
                  | "planned"
                  | "in_progress"
                  | "completed"
                  | "archived")}
            >
              {#each statusOptions as status (status.value)}
                <option value={status.value}>{status.label}</option>
              {/each}
            </select>
          </div>
          <Textarea.Textarea
            value={newProduct.description}
            oninput={(e) => (newProduct.description = e.currentTarget.value)}
            placeholder="Description (optional)"
            rows={3}
            class=" text-base"
          />
          <div class="flex justify-end gap-2">
            {#if editingProduct}
              <Button
                variant="ghost"
                onclick={() => {
                  editingProduct = null;
                  newProduct = {
                    name: "",
                    type: "professionalism",
                    status: "planned",
                    description: "",
                    dueDate: undefined,
                  };
                }}
              >
                Cancel Edit
              </Button>
            {/if}
            <Button onclick={addProduct} variant="default"
              >{editingProduct ? "Update" : "Add"} Product</Button
            >
          </div>
        </div>
      </div>

      <!-- Product List -->
      {#if products.length > 0}
        <div
          use:dndzone={{
            items: products,
            flipDurationMs: 300,
            dropTargetStyle: {},
            dragDisabled: isPending,
            transformDraggedElement: (draggedEl: HTMLElement | undefined) => {
              if (draggedEl) {
                draggedEl.style.transform = "scale(1.02)";
              }
              return draggedEl;
            },
          }}
          onconsider={handleDndConsider}
          onfinalize={handleDndFinalize}
          class="space-y-4"
        >
          {#each products as product (product.id)}
            <div
              animate:flip={{ duration: 300 }}
              class="flex items-start gap-4 p-5 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-gray-700 group hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-md"
            >
              <div
                class="cursor-move opacity-0 group-hover:opacity-100 transition-opacity pt-1"
              >
                <GripVertical
                  class="h-5 w-5 text-gray-400 dark:text-gray-500"
                />
              </div>
              <div class="flex-grow space-y-3">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3 flex-wrap max-w-[75%]">
                    <h4 class=" font-bold text-lg">{product.name}</h4>
                    <span
                      class={`text-sm px-2.5 py-0.5 rounded-full font-medium ${getTypeColor(product.type)}`}
                    >
                      {productTypes.find((t) => t.value === product.type)
                        ?.label}
                    </span>
                    {#if product.dueDate}
                      <span
                        class="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full"
                      >
                        <CalendarIcon class="h-3.5 w-3.5" />
                        {format(new Date(product.dueDate), "PPP")}
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-3">
                    <span
                      class={`text-sm px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(product.status)}`}
                    >
                      {statusOptions.find((s) => s.value === product.status)
                        ?.label}
                    </span>
                    <div class="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => startEditing(product)}
                        class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
                      >
                        <Pencil class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => removeProduct(product.id)}
                        class="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
                {#if product.description}
                  <p
                    class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                  >
                    {product.description}
                  </p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-center text-gray-500 dark:text-gray-400 py-8">
          No products added yet. Add your first research product above.
        </p>
      {/if}
    {:else if products.length > 0}
      <div class="space-y-4">
        {#each products as product (product.id)}
          <div
            class="p-5 bg-background rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3 flex-wrap max-w-[75%]">
                <h4 class=" font-bold text-lg">{product.name}</h4>
                <span
                  class={`text-sm px-2.5 py-0.5 rounded-full font-medium ${getTypeColor(product.type)}`}
                >
                  {productTypes.find((t) => t.value === product.type)?.label}
                </span>
                {#if product.dueDate}
                  <span
                    class="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full"
                  >
                    <CalendarIcon class="h-3.5 w-3.5" />
                    {format(new Date(product.dueDate), "PPP")}
                  </span>
                {/if}
              </div>
              <span
                class={`text-sm px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(product.status)}`}
              >
                {statusOptions.find((s) => s.value === product.status)?.label}
              </span>
            </div>
            {#if product.description}
              <p
                class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3"
              >
                {product.description}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <EmptyState
        title="No research products found"
        description="Add your first research product to get started."
        variant="data-empty"
        ctaText="Add Product"
        ctaAction={() => {
          editMode = true;
          newProduct = {
            name: "",
            type: "professionalism",
            status: "planned",
            description: "",
            dueDate: undefined,
          };
        }}
        icon={Plus}
      />
    {/if}
  </CardContent>

  {#if editMode}
    <CardFooter
      class="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 pt-4"
    >
      <Button
        variant="ghost"
        size="sm"
        onclick={() => (editMode = false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button size="sm" onclick={saveProducts} disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </CardFooter>
  {/if}
</Card>
