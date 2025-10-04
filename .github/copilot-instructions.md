# Exchron Dashboard - AI Coding Guidelines

## Project Overview
Exchron is a Next.js 15 machine learning dashboard with a sophisticated tab-based interface for data analysis. The app features custom interactive components and a carefully designed light theme aesthetic. The application has two distinct modes: Playground and Classroom, which are toggled via the mode dropdown in the header.

### Dashboard Modes
- **Playground Mode**: For experimenting with pre-built models
  - Tab 1: Overview - Model architecture and performance metrics
  - Tab 2: Data Input - Manual data entry and file upload
  - Tab 3: Results - Analysis of model outputs
  - Tab 4: Enhance - Tools for improving model results

- **Classroom Mode**: For creating and training custom models
  - Tab 1: Data Input - Data entry and preparation
  - Tab 2: Model Selection - Choose model architecture and parameters
  - Tab 3: Train & Validate - Model training and validation
  - Tab 4: Test & Export - Test results and model export

## Architecture Patterns

### Routing & Navigation
- Uses Next.js App Router with nested layouts
- Root redirects `/` → `/dashboard/playground/overview` in `src/app/page.tsx`
- Mode-specific routing structure: `/dashboard/playground/*` and `/dashboard/classroom/*`
- Mode selection stored in localStorage to persist between sessions
- Each route renders `DashboardLayout` with appropriate `activeTab` and `mode` props
- Mode selection drives tab rendering and redirects to proper route

### Component Structure
```
DashboardLayout (shared shell) 
├── TabNavigation (sidebar nav)
├── Header (mode dropdown, actions)
└── {children} (page-specific content)
```

### State Management Patterns
- Client components use local useState for UI state (dropdowns, sliders, form inputs)
- Complex interactions (drag-and-drop sliders) use event listeners and refs with useEffect cleanup
- File upload state managed locally with simulated async operations
- Mode state syncs between localStorage, URL path, and component state

## Key Conventions

### Styling System
- **Theme**: Light theme with specific color palette defined in `globals.css` CSS variables
- **Cards**: All content uses `Card`, `CardTitle`, `CardContent` components from `ui/Card.tsx`
- **Colors**: Primary background `#ECECEC`, cards `#FFFFFF`, sidebar `#F9F9F9`, selected states `#E6E7E9`
- **Typography**: Inter font family with consistent text sizing patterns
- **CSS Variables**: Used for colors, spacing, and typography scales (e.g., `var(--input-background)`)

### Component Patterns
- Interactive components always include `"use client"` directive
- Placeholder visualizations use `bg-[#D9D9D9]` gray backgrounds (or `bg-[var(--placeholder-color)]`)
- Action buttons positioned as fixed bottom-right floating elements
- Form inputs follow consistent styling: `bg-[#F9F9F9] border border-[#AFAFAF] rounded`
- Custom slider implementation uses mouse events for drag-and-drop functionality

### Data Flow
- Tab content components imported and rendered within page components
- Each page wraps content in `DashboardLayout` with correct `activeTab` and `mode` props
- Custom slider components sync bidirectionally between visual sliders and text inputs
- Tab navigation determined by current mode (Playground or Classroom)

## Development Workflow

### Running the App
```bash
npm run dev  # Uses --turbopack flag for faster builds
```

### File Organization
- Page components in `src/app/dashboard/[mode]/[tab]/page.tsx`
- Reusable components in `src/components/dashboard/[mode]/[component].tsx`
- UI primitives in `src/components/ui/`
- Shared layout logic in `src/components/dashboard/dashboardlayout.tsx`
- Tab navigation in `src/components/dashboard/tabnavigation.tsx`

## Implementation Guidelines

### Adding New Tabs
1. Create route in `src/app/dashboard/[mode]/[name]/page.tsx`
2. Add tab entry to appropriate tab array in `TabNavigation.tsx` based on mode
3. Create corresponding component in `src/components/dashboard/[mode]/[name].tsx` 
4. Follow existing pattern: wrap content in `DashboardLayout` with correct `activeTab` and `mode`
5. Update links in action buttons to maintain proper flow between tabs

### Interactive Components
- Use React refs for DOM manipulation (sliders, file inputs)
- Implement mouse event handlers with useEffect for event listener cleanup
- Add loading states for async operations (e.g., file upload spinner)
- Follow existing patterns for bidirectional state sync between UI elements
- Maintain consistent placement of action buttons in bottom-right corner

### Styling New Components
- Use existing CSS variables from `globals.css` for colors and spacing
- Maintain card-based layout patterns with consistent padding and rounded corners
 Follow established spacing and typography scales
 - Use placeholder gray backgrounds (`bg-[var(--placeholder-color)]`) for data visualizations
