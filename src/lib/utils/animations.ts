export type TransitionConfig = {
  duration?: number;
  easing?: string;
};

export const defaultTransition: TransitionConfig = {
  duration: 200,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const fastTransition: TransitionConfig = {
  duration: 150,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const slowTransition: TransitionConfig = {
  duration: 300,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};

/**
 * Slide transition for elements
 */
export function slideTransition(
  node: Element,
  params: {
    direction?: "up" | "down" | "left" | "right";
    duration?: number;
  } = {}
) {
  const { direction = "down", duration = 200 } = params;

  const transforms = {
    up: "translateY(-10px)",
    down: "translateY(10px)",
    left: "translateX(-10px)",
    right: "translateX(10px)",
  };

  return {
    duration,
    css: (t: number) => `
      transform: ${transforms[direction]} scale(${0.95 + 0.05 * t});
      opacity: ${t};
    `,
  };
}

/**
 * Scale transition for buttons and interactive elements
 */
export function scaleTransition(
  node: Element,
  params: { duration?: number; scale?: number } = {}
) {
  const { duration = 150, scale = 0.95 } = params;

  return {
    duration,
    css: (t: number) => `
      transform: scale(${scale + (1 - scale) * t});
      opacity: ${t};
    `,
  };
}

/**
 * Fade transition with optional blur
 */
export function fadeTransition(
  node: Element,
  params: { duration?: number; blur?: boolean } = {}
) {
  const { duration = 200, blur = false } = params;

  return {
    duration,
    css: (t: number) => `
      opacity: ${t};
      ${blur ? `filter: blur(${(1 - t) * 4}px);` : ""}
    `,
  };
}
