/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_FULLSTORY_ORG_ID?: string;
  readonly VITE_POSTHOG_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Module declarations for .svelte.ts files (Svelte 5 runes state files)
declare module "*.svelte.ts" {
  const module: any;
  export = module;
}
