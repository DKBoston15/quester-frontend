import { mount } from "svelte";
import posthog from "posthog-js";
import "./app.css";
import App from "./App.svelte";

if (typeof window !== "undefined") {
  posthog.init("phc_dCURAf3ejcvPegQugDwb81gCUWToawioOrjGKQn5Lmg", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
  });
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
