import { mount } from "svelte";
import posthog from "posthog-js";
import "./app.css";
import App from "./App.svelte";

if (typeof window !== "undefined") {
  try {
    posthog.init(import.meta.env.VITE_POSTHOG_TOKEN, {
      api_host:
        import.meta.env.VITE_POSTHOG_API_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
    });
  } catch (error) {
    console.error("Failed to initialize PostHog:", error);
  }
}

const target = document.getElementById("app");
if (!target) {
  throw new Error("Could not find app element");
}

const app = mount(App, {
  target,
  props: {
    url: window.location.pathname,
  },
});

export default app;
