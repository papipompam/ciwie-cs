# CIWIE CS Design System

## Direction

Administrative workspace in Operate mode. The interface should feel orderly, calm, and trustworthy, closely following the supplied desktop references while remaining responsive.

## Color

- Primary action: indigo/blue
- Neutral surfaces: white and cool slate
- Page background: very light cool gray
- Semantic status: green success, amber warning, red error, violet informational
- Use color for status and action hierarchy, never as the only status signal

## Typography

- Noto Sans Thai for all product UI
- Page title: compact, bold, high contrast
- Body and table copy: readable at dense administrative scale
- Identifiers and numbers use tabular numerals where comparison matters

## Layout

- Persistent left sidebar on desktop and drawer on mobile
- Slim sticky top header with term context, notifications, and user menu
- Main content uses a wide fluid canvas with consistent horizontal alignment
- Page order: title and breadcrumb, actions, summary metrics, filters, table/content

## Components

- Radius 12–16px for cards and content surfaces
- Use either a subtle border or a soft low elevation, not both heavily
- Primary buttons are solid indigo; secondary actions are outlined or ghost
- Tables use quiet headers, compact rows, semantic status labels, and icon-only secondary row actions with accessible names
- Metric cards emphasize the value, with a restrained tinted icon tile and supporting context

## Responsive Behavior

- Sidebar becomes a managed drawer on narrow screens
- Metric cards collapse from multi-column to two columns and then one
- Data tables scroll horizontally when comparison is essential
- Page actions wrap without separating the primary action from the title context

## Constraints

- Preserve Nuxt UI components, existing routes, permissions, API contracts, workflow, and real product copy
- No decorative gradients, glassmorphism, excessive shadows, or unrelated animation
- Do not invent product data or actions to reproduce a screenshot
