// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

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
  console.log("Setting theme to:", theme);

  // Instead of toggle, explicitly add/remove the class
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem("theme", theme);
  console.log("Current classes:", root.classList.toString());
};

// Initialize theme
export const initializeTheme = () => {
  if (!isBrowser) return;
  console.log("Initializing theme");

  const theme = getPreferredTheme() as "dark" | "light";
  console.log("Initial theme:", theme);
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
  console.log("Current theme before toggle:", current);
  setTheme(current === "dark" ? "light" : "dark");
};
