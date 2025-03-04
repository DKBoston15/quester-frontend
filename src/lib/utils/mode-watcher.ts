// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";
import { writable } from "svelte/store";

export const isDarkMode = writable(false);

// Get the user's preference from localStorage or system preference
const getPreferredTheme = () => {
  if (!isBrowser) return "light";

  const stored = localStorage.getItem("theme");
  if (stored) return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// Function to set theme
const setTheme = (theme: "dark" | "light") => {
  if (!isBrowser) return;

  const root = document.documentElement;

  // Instead of toggle, explicitly add/remove the class
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.setProperty("--background-color", "#1a1a1a"); // Dark background
    root.style.setProperty("--button-background", "#2d2d2d"); // Dark button background
    root.style.setProperty("--container-background", "#242424"); // Dark container background
    isDarkMode.set(true);
  } else {
    root.classList.remove("dark");
    root.style.setProperty("--background-color", "#ffffff"); // Light background
    root.style.setProperty("--button-background", "#f0f0f0"); // Light button background
    root.style.setProperty("--container-background", "#f5f5f5"); // Light container background
    isDarkMode.set(false);
  }

  localStorage.setItem("theme", theme);
};

// Initialize theme
export const initializeTheme = () => {
  if (!isBrowser) return;

  const theme = getPreferredTheme() as "dark" | "light";
  setTheme(theme);

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        // Only react if user hasn't manually set preference
        setTheme(e.matches ? "dark" : "light");
      }
    });
};

// Toggle theme
export const toggleMode = () => {
  if (!isBrowser) return;

  const current = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
  setTheme(current === "dark" ? "light" : "dark");
};
