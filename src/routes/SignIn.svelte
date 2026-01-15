<script lang="ts">
  export let onLogin: () => void;
  import logo from "../assets/logo.png";
  import { ModeToggle } from "$lib/components/ui/darkmode-toggle";
  import * as Tooltip from "$lib/components/ui/tooltip";
  
function handleGoogleSignIn() {
    onLogin();
  }

  function handleEmailSignIn() {
    onLogin();
  }
</script>

<div
  class="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors animate-fade-in dark:bg-bg dark:text-textPrimary"
>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 hidden opacity-[0.12] dark:block"
    style="background: radial-gradient(circle at center, rgba(76, 140, 245, 0.45) 0%, transparent 55%);"
  ></div>

  <header
    class="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:py-8"
  >
    <div class="flex items-center gap-3 opacity-90">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-card shadow-sm dark:bg-surface"
      >
        <img src={logo} alt="Quester logo" class="h-6 w-6" />
      </div>
      <div>
        <p class="text-sm font-semibold text-foreground dark:text-textPrimary">
          Quester
        </p>
      </div>
    </div>

    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <div
            class="rounded-full border border-border bg-card/80 p-1 shadow-sm transition hover:border-brand/70 dark:border-stroke dark:bg-surface/80 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          >
            <ModeToggle class="h-9 w-9" />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content class="text-xs">
          <p>Toggle theme</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </header>

  <main
    class="relative z-10 flex min-h-[calc(100vh-160px)] items-center px-6 pb-16 sm:px-10 lg:pb-24"
  >
    <div
      class="mx-auto flex w-full max-w-[520px] flex-col items-center gap-10 text-center lg:max-w-[560px]"
    >
      <div class="space-y-4">
        <h1
          class="text-[38px] font-extrabold leading-[46px] tracking-[-0.02em] text-foreground dark:text-textPrimary sm:text-[40px] sm:leading-[48px]"
        >
          Built for Academic Research
        </h1>
        <p
          class="text-base font-medium leading-[24px] text-muted-foreground dark:text-textSecondary"
        >
          Manage literature, notes, analysis, and outcomes in one place.
        </p>
      </div>

      <section
        class="w-full rounded-[16px] border border-border bg-card p-6 text-left shadow-md transition duration-150 backdrop-blur-sm dark:border-stroke dark:bg-surface/95 dark:shadow-[0_10px_32px_rgba(0,0,0,0.4)] lg:p-7"
      >
        <div class="space-y-2 text-center">
          <h2
            class="text-[20px] font-bold leading-[28px] text-foreground dark:text-textPrimary"
          >
            Sign in to Quester
          </h2>
          <p
            class="text-[13px] leading-[20px] text-muted-foreground dark:text-textSecondary"
          >
            Choose a sign-in method below to continue.
          </p>
        </div>

        <div class="mt-6 space-y-5">
          <button
            id="btn-google"
            class="flex h-11 w-full items-center justify-center gap-3 rounded-[12px] bg-white text-[15px] font-bold leading-[24px] text-[#0B0E13] shadow-sm transition duration-150 hover:-translate-y-[1px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:bg-[#F2F5F9] dark:hover:shadow-[0_14px_44px_rgba(0,0,0,0.25)] dark:focus-visible:ring-offset-surface"
            type="button"
            on:click={handleGoogleSignIn}
          >
            <img
              src="/icons/google.svg"
              alt=""
              aria-hidden="true"
              class="h-5 w-5"
            />
            Continue with Google
          </button>

          <div
            class="relative text-center text-[13px] leading-[20px] text-muted-foreground dark:text-textSecondary"
            role="separator"
            aria-label="or"
          >
            <div class="h-px bg-border dark:bg-stroke"></div>
            <span
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[12px] text-muted-foreground dark:bg-surface dark:text-textSecondary"
            >
              or
            </span>
          </div>

          <button
            id="btn-email-password"
            class="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-muted/60 text-[15px] font-bold leading-[24px] text-foreground transition duration-150 hover:-translate-y-[1px] hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:border-stroke dark:bg-surfaceAlt dark:text-textPrimary dark:hover:bg-[#1A2130] dark:hover:shadow-[0_14px_44px_rgba(0,0,0,0.35)] dark:focus-visible:ring-offset-surface"
            type="button"
            on:click={handleEmailSignIn}
          >
            Use email &amp; password
          </button>
        </div>

        <div
          class="mt-6 space-y-3 text-center text-[13px] leading-[20px] text-muted-foreground dark:text-textSecondary"
        >
          <p>
            Having trouble?
            <a
              class="text-brand transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-surface"
              href="mailto:support@quester.ai"
            >
              Contact support
            </a>
          </p>
          <p>
            <a
              class="transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-offset-surface"
              href="https://www.quester.tech/privacy_policy">Privacy Policy</a
            >
          </p>
          <p
            class="text-[12px] leading-[18px] text-muted-foreground/75 dark:text-textSecondary/75"
          >
            By continuing you agree to our Privacy Policy.
          </p>
        </div>
      </section>

      <div class="w-full">
        <div
          class="rounded-lg bg-muted/70 px-4 py-3 text-[13px] leading-[20px] text-muted-foreground dark:bg-gradient-to-r dark:from-[#111827] dark:to-[#0F1724] dark:text-textSecondary"
        >
          Trusted by researchers at
          <span class="font-semibold text-foreground dark:text-textPrimary/85"
            >Harvard</span
          >,
          <span class="font-semibold text-foreground dark:text-textPrimary/85"
            >Johns Hopkins</span
          >,
          <span class="font-semibold text-foreground dark:text-textPrimary/85"
            >UCLA</span
          >,
          <span class="font-semibold text-foreground dark:text-textPrimary/85"
            >NYU</span
          >,
          <span class="font-semibold text-foreground dark:text-textPrimary/85"
            >USC</span
          >.
        </div>
      </div>
    </div>
  </main>
</div>
