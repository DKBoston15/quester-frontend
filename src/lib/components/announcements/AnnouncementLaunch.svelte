<script lang="ts">
  import type { Announcement } from "$lib/stores/AnnouncementStore.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Rocket,
    Search,
    Users,
    Download,
    Brain,
    Shapes,
    Smartphone,
    CheckCircle,
    Star,
    Target,
    History,
    Bell,
    Calendar,
  } from "lucide-svelte";

  interface Props {
    announcement: Announcement;
    onAction?: (action: string, metadata?: any) => void;
  }

  let { announcement, onAction }: Props = $props();

  // Icon mapping for features
  const featureIcons: Record<string, any> = {
    search: Search,
    users: Users,
    download: Download,
    brain: Brain,
    shapes: Shapes,
    smartphone: Smartphone,
    history: History,
    bell: Bell,
    calendar: Calendar,
  };

  // Color mapping for features
  const featureColors: Record<string, string> = {
    purple:
      "from-purple-500 to-violet-500 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-l-purple-500",
    blue: "from-blue-500 to-cyan-500 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-l-blue-500",
    emerald:
      "from-emerald-500 to-green-500 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-l-emerald-500",
    orange:
      "from-orange-500 to-red-500 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-l-orange-500",
    indigo:
      "from-indigo-500 to-purple-500 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-l-indigo-500",
    rose: "from-rose-500 to-pink-500 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-l-rose-500",
    amber:
      "from-amber-500 to-orange-500 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-l-amber-500",
  };

  function handleAction(actionType: string, actionData?: any) {
    if (onAction) {
      onAction(actionType, actionData);
    }
  }
</script>

<!-- Comprehensive Launch Announcement Template -->
<div class="space-y-8">
  <!-- Hero Section -->
  <div
    class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 p-8"
  >
    <div class="absolute top-0 right-0 -mt-6 -mr-6">
      <div
        class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-15"
      >
        <Rocket class="w-10 h-10" />
      </div>
    </div>

    <div class="relative">
      <div class="flex items-center gap-3 mb-4">
        <div
          class="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
        >
          <Rocket class="w-5 h-5 text-white" />
        </div>
        <Badge
          variant="secondary"
          class="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 hover:bg-blue-100 border-0"
        >
          {announcement.metadata?.heroSection?.badgeText || "🚀 Major Launch"}
        </Badge>
      </div>

      <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        {announcement.metadata?.heroSection?.subtitle ||
          announcement.metadata?.version ||
          "Major Platform Update"}
      </h3>

      <p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg">
        {announcement.metadata?.heroSection?.description ||
          announcement.content}
      </p>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          class="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg backdrop-blur-sm"
        >
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            5
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            New Features
          </div>
        </div>
        <div
          class="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg backdrop-blur-sm"
        >
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            20+
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Major Improvements
          </div>
        </div>
        <div
          class="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg backdrop-blur-sm"
        >
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            15+
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Bug Fixes</div>
        </div>
        <div
          class="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg backdrop-blur-sm"
        >
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            100s
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            User Suggestions Implemented
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Major Features Grid -->
  {#if announcement.metadata?.majorFeatures}
    <div class="space-y-6">
      <div class="text-center">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          🚀 New Features
        </h4>
        <p class="text-gray-600 dark:text-gray-400">
          Transforming how you conduct research
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        {#if announcement.metadata?.majorFeatures}
          {#each announcement.metadata.majorFeatures as feature}
            <Card
              class="border-l-4 {featureColors[feature.color]
                ?.split(' ')
                .slice(-1)[0] ||
                'border-l-gray-500'} hover:shadow-lg transition-shadow"
            >
              <CardHeader class="pb-4">
                <div class="flex items-start gap-4">
                  <div
                    class="p-3 rounded-xl {featureColors[feature.color]
                      ?.split(' ')
                      .slice(2, 6)
                      .join(' ') || 'bg-gray-100 dark:bg-gray-800'}"
                  >
                    <svelte:component
                      this={featureIcons[feature.icon] || Target}
                      class="w-6 h-6"
                    />
                  </div>
                  <div class="flex-1">
                    <CardTitle class="text-lg font-semibold mb-2"
                      >{feature.title}</CardTitle
                    >
                    <p
                      class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="pt-0">
                {#if feature.highlights}
                  <div class="mb-4">
                    <h5
                      class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
                    >
                      ✨ Key Highlights:
                    </h5>
                    <ul
                      class="text-xs text-gray-600 dark:text-gray-400 space-y-1"
                    >
                      {#each feature.highlights as highlight}
                        <li class="flex items-start gap-2">
                          <CheckCircle
                            class="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0"
                          />
                          <span>{highlight}</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if feature.benefits}
                  <div class="mb-4">
                    <h5
                      class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
                    >
                      🎯 Benefits:
                    </h5>
                    <ul
                      class="text-xs text-gray-600 dark:text-gray-400 space-y-1"
                    >
                      {#each feature.benefits as benefit}
                        <li class="flex items-start gap-2">
                          <Star
                            class="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0"
                          />
                          <span>{benefit}</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </CardContent>
            </Card>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- Footer Note -->
  {#if announcement.metadata?.footerNote}
    <div class="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
      <p class="text-sm text-gray-600 dark:text-gray-400 italic">
        {announcement.metadata.footerNote}
      </p>
    </div>
  {/if}
</div>
