/// <reference types="svelte" />
/// <reference types="vite/client" />

// Module declarations for .svelte.ts files (Svelte 5 runes state files)
declare module "*.svelte.ts" {
  const module: any;
  export = module;
}
