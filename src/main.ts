import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

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
