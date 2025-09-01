<script lang="ts">
  import type { Announcement } from '$lib/stores/AnnouncementStore'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  import { Progress } from '$lib/components/ui/progress'
  import { 
    Megaphone, 
    Calendar, 
    Users, 
    ExternalLink, 
    Clock,
    CheckCircle2,
    AlertCircle
  } from 'lucide-svelte'

  interface Props {
    announcement: Announcement
    onAction: (action: string, metadata?: any) => void
  }

  let { announcement, onAction }: Props = $props()

  function handleActionClick(actionType: string, actionData?: any) {
    onAction(actionType, { 
      ...actionData,
      source: 'announcement-two',
      timestamp: new Date().toISOString()
    })
  }

  // Calculate time-sensitive information
  function getTimeRemaining(expiresAt: string | null): string {
    if (!expiresAt) return ''
    
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`
    return 'Less than an hour remaining'
  }
</script>

<!-- System Update/Event Announcement Template -->
<div class="space-y-6">
  <!-- Header with Icon and Status -->
  <div class="flex items-start gap-4">
    <div class="flex-shrink-0">
      <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
        <Megaphone class="w-6 h-6 text-orange-600 dark:text-orange-400" />
      </div>
    </div>
    
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {announcement.metadata?.eventTitle || announcement.title}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            {announcement.content}
          </p>
        </div>
        
        {#if announcement.metadata?.urgentBadge}
          <Badge variant="destructive" class="flex-shrink-0">
            {announcement.metadata.urgentBadge}
          </Badge>
        {/if}
      </div>
    </div>
  </div>

  <!-- Event Details Card -->
  {#if announcement.metadata?.eventDetails}
    <Card>
      <CardContent class="p-4">
        <div class="grid gap-4 sm:grid-cols-2">
          {#if announcement.metadata.eventDetails.date}
            <div class="flex items-center gap-3">
              <Calendar class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Date</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {announcement.metadata.eventDetails.date}
                </p>
              </div>
            </div>
          {/if}
          
          {#if announcement.metadata.eventDetails.duration}
            <div class="flex items-center gap-3">
              <Clock class="w-4 h-4 text-green-600 dark:text-green-400" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Duration</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {announcement.metadata.eventDetails.duration}
                </p>
              </div>
            </div>
          {/if}
          
          {#if announcement.metadata.eventDetails.affectedUsers}
            <div class="flex items-center gap-3">
              <Users class="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Affected</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {announcement.metadata.eventDetails.affectedUsers}
                </p>
              </div>
            </div>
          {/if}
          
          {#if announcement.expiresAt}
            <div class="flex items-center gap-3">
              <AlertCircle class="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Time Remaining</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {getTimeRemaining(announcement.expiresAt)}
                </p>
              </div>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Progress/Status Bar -->
  {#if announcement.metadata?.progress}
    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {announcement.metadata.progress.label || 'Progress'}
        </span>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {announcement.metadata.progress.value}%
        </span>
      </div>
      <Progress value={announcement.metadata.progress.value} class="h-2" />
    </div>
  {/if}

  <!-- Important Steps/Checklist -->
  {#if announcement.metadata?.steps}
    <Card>
      <CardContent class="p-4">
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          {announcement.metadata.stepsTitle || 'What You Need to Know'}
        </h4>
        <div class="space-y-3">
          {#each announcement.metadata.steps as step, index}
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                {#if step.completed}
                  <CheckCircle2 class="w-3 h-3 text-green-600 dark:text-green-400" />
                {:else}
                  <span class="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {index + 1}
                  </span>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-700 dark:text-gray-300 {step.completed ? 'line-through opacity-60' : ''}">
                  {step.text}
                </p>
                {#if step.note}
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {step.note}
                  </p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Quick Links/Resources -->
  {#if announcement.metadata?.resources}
    <Card>
      <CardContent class="p-4">
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Helpful Resources
        </h4>
        <div class="grid gap-2 sm:grid-cols-2">
          {#each announcement.metadata.resources as resource}
            <Button
              variant="ghost"
              size="sm"
              onclick={() => handleActionClick('resource-click', { resource })}
              class="justify-start h-auto p-3 text-left"
            >
              <div class="flex items-center gap-3 w-full">
                <ExternalLink class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {resource.title}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {resource.description}
                  </p>
                </div>
              </div>
            </Button>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Primary Action Buttons -->
  <div class="flex flex-col sm:flex-row gap-3 pt-4">
    {#if announcement.metadata?.primaryAction}
      <Button 
        onclick={() => handleActionClick('primary', announcement.metadata?.primaryAction)}
        class="flex-1"
        variant={announcement.metadata.primaryAction.variant || 'default'}
      >
        {announcement.metadata.primaryAction.label}
      </Button>
    {/if}
    
    {#if announcement.metadata?.secondaryActions}
      {#each announcement.metadata.secondaryActions as action}
        <Button 
          variant={action.variant || 'outline'}
          onclick={() => handleActionClick('secondary', action)}
          class="flex-1"
        >
          {action.label}
        </Button>
      {/each}
    {/if}
  </div>

  <!-- Contact/Support Information -->
  {#if announcement.metadata?.supportInfo}
    <div class="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Need help? {announcement.metadata.supportInfo.message}
      </p>
      {#if announcement.metadata.supportInfo.contactLink}
        <Button
          variant="link"
          size="sm"
          onclick={() => handleActionClick('support-contact', announcement.metadata?.supportInfo)}
          class="text-xs p-0 h-auto"
        >
          {announcement.metadata.supportInfo.linkText || 'Contact Support'}
        </Button>
      {/if}
    </div>
  {/if}
</div>
