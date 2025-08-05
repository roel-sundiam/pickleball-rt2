# Design Theme Guide - Richtown2 Pickleball Club

This document outlines the comprehensive design system and theme guidelines for the Richtown2 Pickleball Club reservation application. Follow these guidelines to maintain consistency across all components and features.

## Overview

Our design system features a **modern glassmorphism aesthetic** with **Richtown2 Pickleball Club branding colors** extracted from the club logo and **comprehensive accessibility support**. The system uses extensive CSS custom properties, smooth animations, and a mobile-first responsive approach for optimal user experience.

## Brand Identity

### Logo
- **Club Logo**: `/assets/PickleLogo.png` - Official Richtown2 Pickleball Club logo
- **Usage**: Display prominently in headers, login screens, and main navigation
- **Desktop Size**: 60px height with auto width
- **Mobile Size**: Scales down to 35px on small screens
- **Effects**: Drop shadow filter and subtle hover scale animation (1.05x)

## Color System

### Primary Color Palette (From Club Logo)
```css
/* Green - Primary brand color from logo */
--color-primary: #22C55E;        /* Main green */
--color-primary-light: #4ADE80;  /* Lighter green for backgrounds */
--color-primary-dark: #16A34A;   /* Darker green for text/borders */
--color-primary-hover: #16A34A;  /* Hover states */
--color-primary-active: #15803D; /* Active/pressed states */
```

### Accent Colors (Blue from Logo)
```css
/* Blue - Accent color from logo elements */
--color-accent: #2196F3;         /* Main blue */
--color-accent-light: #60A5FA;   /* Lighter blue variant */
--color-accent-dark: #1976D2;    /* Darker blue variant */
```

### Secondary Colors (Orange from Logo Background)
```css
/* Orange - Secondary color from logo background */
--color-orange: #FF9800;         /* Main orange */
--color-orange-light: #FFB74D;   /* Lighter orange */
--color-orange-dark: #F57C00;    /* Darker orange */
```

### Semantic Colors
```css
--color-success: #10B981;        /* Green - confirmations, success states */
--color-success-light: #34D399;  /* Lighter success variant */
--color-success-dark: #059669;   /* Darker success variant */

--color-warning: #F59E0B;        /* Yellow/Orange - alerts, cautions */
--color-warning-light: #FBBF24;  /* Lighter warning variant */
--color-warning-dark: #D97706;   /* Darker warning variant */

--color-error: #EF4444;          /* Red - errors, destructive actions */
--color-error-light: #F87171;    /* Lighter error variant */
--color-error-dark: #DC2626;     /* Darker error variant */

--color-info: #3B82F6;           /* Blue - informational content */
--color-info-light: #60A5FA;     /* Lighter info variant */
--color-info-dark: #2563EB;      /* Darker info variant */
```

### Neutral Scale
```css
--color-white: #FFFFFF;          /* Pure white */
--color-gray-50: #FAFAFA;       /* Lightest backgrounds */
--color-gray-100: #F5F5F5;      /* Light backgrounds */
--color-gray-200: #EEEEEE;      /* Borders, dividers */
--color-gray-300: #E0E0E0;      /* Disabled states */
--color-gray-400: #BDBDBD;      /* Placeholder text */
--color-gray-500: #9E9E9E;      /* Secondary text */
--color-gray-600: #757575;      /* Primary text (light mode) */
--color-gray-700: #424242;      /* Headings */
--color-gray-800: #212121;      /* Dark text */
--color-gray-900: #121212;      /* Darkest text */
```

## Typography

### Font Family
- **Primary**: 'Inter' (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
- **Monospace**: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace

### Font Scale
```css
text-xs:    0.75rem   /* 12px - Small labels, captions */
text-sm:    0.875rem  /* 14px - Body text, form inputs */
text-base:  1rem      /* 16px - Default body text */
text-lg:    1.125rem  /* 18px - Large body text */
text-xl:    1.25rem   /* 20px - Small headings */
text-2xl:   1.5rem    /* 24px - Section headings */
text-3xl:   1.875rem  /* 30px - Page titles */
text-4xl:   2.25rem   /* 36px - Hero text */
text-5xl:   3rem      /* 48px - Large hero text */
```

### Font Weights
```css
font-light:     300
font-normal:    400
font-medium:    500
font-semibold:  600
font-bold:      700
font-extrabold: 800
```

## Glassmorphism System

Our signature design system uses glassmorphism for depth, visual hierarchy, and modern aesthetics. All components follow these glass effect patterns:

### Core Glassmorphism Properties
```css
/* CSS Custom Properties for Glass Effects */
--glass-bg: rgba(255, 255, 255, 0.1);              /* Base glass background */
--glass-bg-dark: rgba(255, 255, 255, 0.05);        /* Subtle glass variant */
--glass-bg-light: rgba(255, 255, 255, 0.2);        /* Prominent glass variant */
--glass-bg-strong: rgba(255, 255, 255, 0.25);      /* Strong glass for hovers */
--glass-border: rgba(255, 255, 255, 0.2);          /* Glass border color */
--glass-border-strong: rgba(255, 255, 255, 0.3);   /* Strong border variant */
--glass-backdrop-blur: blur(10px);                 /* Standard blur effect */
--glass-backdrop-blur-strong: blur(20px);          /* Strong blur for headers */
```

### Standard Glass Container Pattern
```css
.glass-container {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-backdrop-blur-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.glass-container:hover {
  background: var(--glass-bg-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow-2xl);
}
```

### Glass Effect Hierarchy
- **Headers/Navigation**: `var(--glass-bg-light)` with `blur(20px)` for prominence
- **Primary Cards**: `var(--glass-bg-light)` with `blur(10px)` for main content
- **Secondary Elements**: `var(--glass-bg)` with `blur(10px)` for supporting content
- **Subtle Overlays**: `var(--glass-bg-dark)` with `blur(10px)` for backgrounds

### Background Gradient Pattern
Every page uses this gradient background with floating animation:
```css
.page-container {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-accent-dark) 100%);
  position: relative;
  overflow: hidden;
}

.page-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg>...</svg>') repeat;
  animation: float 30s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}
```

## Component Guidelines

### Navigation Standards

#### "Back to Dashboard" Button (Required on All Pages)
Every component must include a consistent "Back to Dashboard" button:
```css
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: var(--glass-bg-light);
  backdrop-filter: blur(10px);
  color: var(--color-white);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-base);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
}

.back-btn:hover {
  background: var(--glass-bg-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

### Button System

#### Primary Button (Action Buttons)
```css
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  min-height: 44px; /* Touch-friendly */
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-accent-dark) 100%);
}

.btn-primary:hover::before {
  left: 100%;
}
```

#### Glass Button (Secondary Actions)
```css
.btn-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  color: var(--color-white);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.btn-glass:hover {
  background: var(--glass-bg-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

#### Admin Button (Admin Actions)
```css
.btn-admin {
  background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%);
  color: var(--color-white);
  /* Same structure as btn-primary with purple gradient */
}
```

#### Button Sizes
- **Small**: `padding: var(--spacing-sm) var(--spacing-base); font-size: var(--font-size-xs)`
- **Base**: `padding: var(--spacing-md) var(--spacing-lg); font-size: var(--font-size-sm)`
- **Large**: `padding: var(--spacing-lg) var(--spacing-2xl); font-size: var(--font-size-base)`

### Form Elements

#### Glass Input Fields
```css
.form-input {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-backdrop-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-base);
  min-height: 44px; /* Accessibility touch target */
  color: var(--color-white);
  font-size: var(--font-size-base);
  transition: all var(--transition-base);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring-primary);
  background: var(--glass-bg-strong);
}

.form-input.error {
  border-color: var(--color-error);
  box-shadow: var(--focus-ring-error);
}
```

### Glass Select/Dropdown Fields (Critical Fix)
**Important**: Dropdown options visibility requires special handling across browsers:

```css
.form-select {
  /* Same styling as form-input */
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-backdrop-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  
  /* Dropdown-specific styling */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url('data:image/svg+xml,<svg>...</svg>');
  background-repeat: no-repeat;
  background-position: right var(--spacing-base) center;
  background-size: 16px;
  color: var(--color-white);
}

/* CRITICAL: Option visibility fix */
.form-select option {
  background: var(--color-gray-800) !important;
  color: var(--color-white) !important;
  padding: var(--spacing-sm);
  border: none;
}

.form-select option:hover,
.form-select option:checked {
  background: var(--color-primary) !important;
  color: var(--color-white) !important;
}

/* Browser-specific fixes */
@-moz-document url-prefix() {
  .form-select option {
    background: #2D3748 !important;
    color: #FFFFFF !important;
  }
}

@media screen and (-webkit-min-device-pixel-ratio:0) {
  .form-select option {
    background: #2D3748 !important;
    color: #FFFFFF !important;
  }
}
```

**Dropdown Styling Notes:**
- Always use `!important` for option colors due to browser default overrides
- Include browser-specific fixes for Firefox and WebKit browsers
- Test dropdown visibility in all major browsers (Chrome, Firefox, Safari, Edge)
- Use dark background colors for options to ensure white text visibility

#### Form Labels
```css
.form-label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--color-white);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Card System

#### Standard Glass Card (Primary Content)
```css
.feature-card {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-backdrop-blur-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  opacity: 0;
  transition: opacity var(--transition-base);
}

.feature-card:hover {
  transform: translateY(-4px);
  background: var(--glass-bg-strong);
  box-shadow: var(--shadow-2xl);
}

.feature-card:hover::before {
  opacity: 1;
}
```

#### Header Cards (Page Headers)
```css
.page-header {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-backdrop-blur-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
}
```

## Spacing Scale

Use consistent spacing throughout the application:

```css
spacing-1:   4px
spacing-2:   8px
spacing-3:   12px
spacing-4:   16px
spacing-5:   20px
spacing-6:   24px
spacing-8:   32px
spacing-10:  40px
spacing-12:  48px
spacing-16:  64px
spacing-20:  80px
```

## Animations & Transitions

### Standard Transitions
```css
--transition-fast:   150ms ease-in-out  /* Quick interactions */
--transition-base:   250ms ease-in-out  /* Standard transitions */
--transition-slow:   350ms ease-in-out  /* Complex animations */
```

### Common Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hover lift */
.hover-lift:hover {
  transform: translateY(-2px);
  transition: transform 150ms ease-in-out;
}

/* Float animation for backgrounds */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

## Responsive Design

### Breakpoints
```css
sm:   640px   /* Small devices */
md:   768px   /* Medium devices */
lg:   1024px  /* Large devices */
xl:   1280px  /* Extra large devices */
```

### Mobile-First Approach
- Design for mobile first (320px+)
- Scale up for larger screens
- Touch targets minimum 44px
- Adequate spacing for finger navigation

## Dark Mode Support

Use CSS custom properties for theme switching:

```css
/* Light mode (default) */
:root {
  --bg-primary: #ffffff;
  --text-primary: #374151;
}

/* Dark mode */
[data-theme="dark"] {
  --bg-primary: #1f2937;
  --text-primary: #f9fafb;
}
```

## Accessibility Guidelines

- **Color Contrast**: Minimum 4.5:1 ratio (WCAG AA)
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Touch Targets**: Minimum 44px for mobile
- **Semantic HTML**: Use proper heading hierarchy and ARIA labels
- **Keyboard Navigation**: Ensure all features work with keyboard only

## Icons & Graphics

- Use **Angular Material Icons** for consistency
- Maintain 24px standard size for most icons
- Use outline style for better scalability
- Apply primary color for interactive icons

## Implementation Notes

### CSS Custom Properties
Use the design token system defined in `/frontend/pickleball-app/src/styles.scss`:

```css
/* Example usage */
.my-component {
  background: var(--color-primary);
  color: var(--color-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-4);
}
```

### Angular Material Theming
The app uses Angular Material with custom theme configuration. Refer to the existing theme setup in the styles files.

### Component Development
1. Follow the established glassmorphism patterns
2. Use consistent spacing from the scale
3. Implement hover and focus states
4. Ensure mobile responsiveness
5. Test with both light and dark modes (if implemented)

## Layout Patterns

### Page Structure Template
Every page should follow this consistent structure:
```html
<div class="page-container">
  <!-- Background animation -->
  <div class="pickleball-bg"></div>
  
  <!-- Navigation header with back button -->
  <div class="nav-header">
    <button class="back-btn" (click)="goToDashboard()">
      <!-- Back arrow icon --> Back to Dashboard
    </button>
  </div>
  
  <!-- Main content area -->
  <div class="main-content">
    <!-- Page header -->
    <div class="page-header">
      <h1>Page Title</h1>
      <p>Page description</p>
    </div>
    
    <!-- Content cards -->
    <div class="content-grid">
      <div class="feature-card">
        <!-- Card content -->
      </div>
    </div>
  </div>
</div>
```

### Responsive Grid System
```css
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-xl);
  padding: 0 var(--spacing-xl);
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-base);
    padding: 0 var(--spacing-base);
  }
}
```

## Animation Library

### Standard Animations
```css
/* Fade in animation for content */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Float animation for backgrounds */
@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-2px, -5px) rotate(0.5deg); }
  50% { transform: translate(5px, -2px) rotate(-0.5deg); }
  75% { transform: translate(-5px, 2px) rotate(0.5deg); }
}

/* Card slide in animation */
@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

## Implementation Examples

### ✅ **Properly Themed Components** (Reference Examples)
- **Dashboard Component** (`dashboard/dashboard.component.ts`): Complete glassmorphism with gradient backgrounds, feature cards, and responsive design
- **Login Component** (`login/login.component.ts`): Perfect glass form design with animations and proper focus states
- **Profile Component** (`profile/profile.component.ts`): Glass containers with user information and proper spacing
- **Poll List Component** (`polls/poll-list.component.ts`): Advanced theming with interactive poll cards and results

### 🔧 **Components to Update** (Implementation Targets)
- **Book Reservation Component**: Convert to full glassmorphism with weather integration styling
- **Admin Dashboard Component**: Apply admin-specific purple theming with glass effects
- **Reservation List Component**: Glass reservation cards with status indicators
- **Schedule Component**: Glass time slot cards with weather information

## Development Guidelines

### CSS Custom Properties Usage
Always use design tokens instead of hardcoded values:
```css
/* ✅ Good - Uses design tokens */
.my-component {
  background: var(--glass-bg-light);
  padding: var(--spacing-xl);
  border-radius: var(--radius-2xl);
  color: var(--color-white);
}

/* ❌ Bad - Hardcoded values */
.my-component {
  background: rgba(255, 255, 255, 0.2);
  padding: 32px;
  border-radius: 16px;
  color: white;
}
```

### Accessibility Requirements
- **Color Contrast**: Minimum 4.5:1 ratio (WCAG AA) - all white text on glass backgrounds meets this
- **Focus Indicators**: Use `var(--focus-ring-primary)` for all interactive elements
- **Touch Targets**: Minimum 44px height for all buttons and inputs
- **Semantic HTML**: Proper heading hierarchy, ARIA labels where needed
- **Keyboard Navigation**: All functionality accessible via keyboard

### Mobile-First Implementation
```css
/* Mobile first (default) */
.component {
  padding: var(--spacing-base);
  font-size: var(--font-size-sm);
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: var(--spacing-xl);
    font-size: var(--font-size-base);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-2xl);
    font-size: var(--font-size-lg);
  }
}
```

---

## Summary

This comprehensive design system ensures consistency, accessibility, and modern aesthetics across the entire Richtown2 Pickleball Club application. The glassmorphism effects create depth and visual hierarchy while maintaining readability and usability.

**Key Principles:**
- **Consistency**: Use established patterns and design tokens
- **Accessibility**: Meet WCAG AA standards for all users
- **Performance**: Efficient CSS with proper transitions
- **Responsiveness**: Mobile-first approach for all devices
- **Maintainability**: CSS custom properties for easy theme updates

When implementing new components or updating existing ones, always refer to the properly themed examples (Dashboard, Login, Profile) and follow these documented patterns.