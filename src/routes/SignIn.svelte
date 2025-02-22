<script lang="ts">
  export let onLogin: () => void;
  import logo from "../assets/logo.png";
  import { ModeToggle } from "$lib/components/ui/darkmode-toggle";
  import * as Tooltip from "$lib/components/ui/tooltip";
</script>

<div
  class="relative min-h-screen bg-background dark:bg-dark-background transition-colors duration-300"
>
  <!-- Background pattern -->
  <div
    class="absolute inset-0"
    style="background-image: radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0) dark:radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0); background-size: 20px 20px;"
  ></div>

  <!-- Dark mode toggle -->
  <div class="absolute top-8 right-8">
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <div
            class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card text-card-foreground p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,1)]"
          >
            <ModeToggle />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content
          class="max-w-[20rem] dark:bg-dark-card dark:text-dark-text-primary"
        >
          <p>Change Theme</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </div>

  <!-- Decorative elements -->
  <div
    class="absolute top-20 right-20 w-4 h-4 border-2 border-black dark:border-dark-border bg-yellow-400 dark:bg-dark-accent-yellow rotate-12"
  ></div>
  <div
    class="absolute bottom-20 left-20 w-4 h-4 border-2 border-black dark:border-dark-border bg-blue-400 dark:bg-dark-accent-blue -rotate-12"
  ></div>

  <div class="relative mx-auto max-w-7xl px-6">
    <!-- Top bar with enhanced animation -->
    <div class="pt-8 flex gap-4 items-center">
      <div
        class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,1)]"
      >
        <img
          class="w-8 hover:rotate-12 transition-transform dark:opacity-90"
          alt="Quester Logo"
          src={logo}
        />
      </div>
      <a
        href="/"
        class="text-2xl font-bold hover:-translate-y-0.5 transition-transform relative group text-black dark:text-dark-text-primary"
      >
        Quester
        <div
          class="absolute bottom-0 left-0 w-full h-2 bg-yellow-200 dark:bg-dark-accent-yellow/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
        ></div>
      </a>
    </div>

    <!-- Sign in content -->
    <div class="flex min-h-[calc(100vh-160px)] items-center justify-center">
      <div class="w-full max-w-sm">
        <div
          class="border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(44,46,51,1)]"
        >
          <div class="mb-8 relative">
            <h2
              class=" text-4xl font-bold text-black dark:text-dark-text-primary mb-3"
            >
              Welcome
            </h2>
            <p class="text-lg text-blue-800 dark:text-dark-text-blue">
              Sign in to Quester to continue to your research workspace
            </p>
            <div
              class="mt-4 h-1 w-12 bg-yellow-400 dark:bg-dark-accent-yellow"
            ></div>
          </div>

          <div class="relative group">
            <div
              class="absolute -inset-1 rounded-lg bg-gradient-to-r from-yellow-400 via-blue-500 to-yellow-400 dark:from-dark-accent-yellow dark:via-dark-accent-blue dark:to-dark-accent-yellow blur-sm opacity-70 transition-all animate-gradient-x"
            ></div>
            <button
              on:click={onLogin}
              class="relative w-full border-2 border-black dark:border-dark-border bg-card dark:bg-dark-card px-6 py-3 text-lg text-black dark:text-dark-text-primary transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(44,46,51,1)]"
            >
              Open Research Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
