# Quester Design System Guidelines

This document outlines the design system and styling guidelines used in the Quester platform. Follow these guidelines to maintain consistency across the application.

## Color Palette

### Primary Colors

- Black: Used for borders and text (`#000000`)
- White: Used for backgrounds (`#FFFFFF`)
- Blue:
  - Light blue: Used for backgrounds (`blue-50`)
  - Primary blue: Used for icons (`blue-500`)
  - Light blue accents: Used for hover effects (`blue-200`)
- Yellow:
  - Accent yellow: Used for decorative elements (`yellow-400`)
  - Light yellow: Used for hover effects (`yellow-200`)

## Typography

### Font Families

- Headings: Monospace font (`font-mono`) for a technical, modern feel
- Body text: System default font stack
- Font smoothing: Enabled with `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`

### Text Sizes

- Hero/Main headings: `text-4xl`
- Section headings: `text-2xl`
- Body text: `text-lg`
- Regular text: Base size
- List items: `text-lg`

## Component Styling

### Cards/Containers

1. Standard Card Style:

```css
background-color: white;
border: 2px solid black;
padding: 1.5rem;
box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 1);
```

2. Hover Effect:

```css
transition-all duration-300;
hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)];
```

### Icons

- Size: `w-8 h-8`
- Container: Square with black border and white background
- Hover: Scale transform with smooth transition
- Color: Blue-500

### Interactive Elements

#### Buttons and Links

- Black borders (2-4px)
- Sharp corners
- Shadow effect: 4-8px offset black shadows
- Hover: Enhanced shadow depth
- Optional: Yellow or blue accent underlines/backgrounds

#### Hover Effects

1. Text Underline Effect:

```css
position: relative;
/* Yellow background slide effect */
.hover-effect::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0.5rem;
  background-color: rgba(253, 224, 71, 0.5); /* yellow-200 */
  transform: scaleX(0);
  transition: transform 300ms;
}
.hover-effect:hover::after {
  transform: scaleX(1);
}
```

### Layout

#### Spacing

- Vertical spacing between sections: `space-y-16`
- Padding:
  - Container padding: `p-6`
  - Page padding: `py-20 px-4`
- Margins:
  - Between elements: `mb-4`, `mb-6`, `mb-12`, `mb-16`
  - List item spacing: `space-y-6`

#### Grid/Flex

- Flex layouts for icon + text combinations
- Gap spacing: `gap-4`
- Center alignment: `items-center`

### Animations

#### Entrance Animations

- Fly-in effect:
  - Duration: 800ms
  - Y offset: 20px
  - Staggered delays for sections (300ms + 150ms per item)

#### Hover Transitions

- All transitions: 300ms duration
- Smooth shadow transitions
- Scale transforms on icons
- Background slide effects

### Background Patterns

```css
background-image: linear-gradient(to bottom, blue-50, white), radial-gradient(circle
      at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0);
background-size: 100% 100%, 20px 20px;
```

## Decorative Elements

### Accent Shapes

- Small squares: 1rem x 1rem (w-4 h-4)
- Positioned absolutely
- Colored with blue-400 or yellow-400
- Black borders

### Underline Accents

- Height: 0.5rem - 0.75rem
- Transform: skew for dynamic effect
- Colors: yellow-400, blue-200
- Slide transitions on hover

## Responsive Design

- Max width containers: `max-w-4xl`
- Centered layouts with `mx-auto`
- Responsive padding: `px-4`
- Mobile-first approach

## Best Practices

1. Always maintain the black border + shadow aesthetic for main containers
2. Use staggered animations for list/grid items
3. Implement hover states for interactive elements
4. Maintain consistent spacing using the defined spacing scale
5. Use accent colors sparingly for emphasis
6. Keep text hierarchy consistent with defined sizes
7. Ensure all interactive elements have visible hover states

## Implementation Notes

When implementing this design system:

1. Use Tailwind CSS for consistent styling
2. Implement animations using Svelte's built-in transition system
3. Maintain the playful yet professional aesthetic with geometric accents
4. Use monospace fonts for headings to maintain the technical feel
5. Keep shadows and borders sharp for the distinct visual style
