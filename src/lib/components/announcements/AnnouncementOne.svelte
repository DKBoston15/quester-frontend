<script lang="ts">
  import type { Announcement } from '$lib/stores/AnnouncementStore.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  import { 
    Sparkles, 
    Gift, 
    Users, 
    Search, 
    Brain, 
    Download, 
    Shapes, 
    GraduationCap 
  } from 'lucide-svelte'

  interface Props {
    announcement: Announcement
    onAction?: (action: string, metadata?: any) => void
  }

  let { announcement }: Props = $props()
</script>

<!-- Major Platform Update Template -->
<div class="space-y-6">
  <!-- Hero Section -->
  <div class="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 p-6">
    <div class="absolute top-0 right-0 -mt-4 -mr-4">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20">
        <Sparkles class="w-8 h-8" />
      </div>
    </div>
    
    <div class="relative">
      <div class="flex items-center gap-2 mb-3">
        <Gift class="w-5 h-5 text-blue-600" />
        <Badge variant="secondary" class="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Major Update
        </Badge>
      </div>
      
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {announcement.metadata?.featureTitle || 'Quester 2.5 Platform Update'}
      </h3>
      
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        {announcement.content}
      </p>
    </div>
  </div>

  <!-- Major Features Grid -->
  <div class="grid gap-4 md:grid-cols-2">
    <!-- Team Management Redesign -->
    <Card class="border-l-4 border-l-blue-500">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle class="text-base font-semibold">Team Management Redesign</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Complete overhaul of team navigation with a new sidebar interface replacing the old dropdown system.
        </p>
        <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• Persistent sidebar navigation</li>
          <li>• Quick team switching</li>
          <li>• Enhanced team overview</li>
        </ul>
      </CardContent>
    </Card>

    <!-- Global Search & AI Chat -->
    <Card class="border-l-4 border-l-purple-500">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Search class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle class="text-base font-semibold">Global Search & AI Chat</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Powerful search across all your projects with integrated AI assistance for research questions.
        </p>
        <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• Cross-project search</li>
          <li>• AI-powered research chat</li>
          <li>• Smart content discovery</li>
        </ul>
      </CardContent>
    </Card>

    <!-- Key Insights AI -->
    <Card class="border-l-4 border-l-emerald-500">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Brain class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle class="text-base font-semibold">Key Insights AI</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          AI-driven analysis that automatically identifies patterns and insights from your research data.
        </p>
        <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• Automated pattern detection</li>
          <li>• Research recommendations</li>
          <li>• Smart data synthesis</li>
        </ul>
      </CardContent>
    </Card>

    <!-- Reference Export Suite -->
    <Card class="border-l-4 border-l-orange-500">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Download class="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle class="text-base font-semibold">Reference Export Suite</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Export your references in multiple academic formats for seamless integration with your workflow.
        </p>
        <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• Multiple citation formats</li>
          <li>• Bulk export capabilities</li>
          <li>• Academic standards compliance</li>
        </ul>
      </CardContent>
    </Card>

    <!-- Model Building Enhancements -->
    <Card class="border-l-4 border-l-indigo-500">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Shapes class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle class="text-base font-semibold">Model Building Enhancements</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Advanced visual modeling tools with enhanced node types, edge customization, and workflow improvements.
        </p>
        <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• New node types and shapes</li>
          <li>• Advanced edge styling</li>
          <li>• Improved canvas controls</li>
        </ul>
      </CardContent>
    </Card>

    <!-- Interactive Tutorials -->
    <Card class="border-l-4 border-l-rose-500">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <GraduationCap class="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <CardTitle class="text-base font-semibold">Interactive Tutorials</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Comprehensive guided tours that demonstrate features with automatic examples and hands-on learning.
        </p>
        <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• Step-by-step guidance</li>
          <li>• Automatic demonstrations</li>
          <li>• Context-aware help</li>
        </ul>
      </CardContent>
    </Card>
  </div>

  <!-- Additional Information -->
  {#if announcement.metadata?.additionalInfo}
    <Card class="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/20">
      <CardContent class="p-6">
        <div class="flex items-start gap-4">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Sparkles class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="flex-1">
            <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Enhanced Research Experience
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              These updates work together to create a more intuitive, powerful, and AI-enhanced research platform that adapts to your workflow and helps you discover insights faster than ever before.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}


  <!-- Footer Note -->
  {#if announcement.metadata?.footerNote}
    <div class="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {announcement.metadata.footerNote}
      </p>
    </div>
  {/if}
</div>