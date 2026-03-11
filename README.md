# NavHeader Component — AngularFi

Sci-fi themed top navigation header built with Angular 21 modern syntax.

---

## File Structure

```
nav-header/
├── nav-header.component.ts      # Logic — signals, computed, effects, lifecycle
├── nav-header.component.html    # Template — @for, @if, @defer control flow
├── nav-header.component.scss    # Styles — SCSS with CSS custom properties
└── README.md
```

---

## Angular 21 Features Used

| Feature | Where Used |
|---|---|
| `signal()` | `isAuthenticated`, `user`, `navItems`, `activeSubNav`, `userDropdownOpen`, `mobileMenuOpen`, `isScrolled` |
| `computed()` | `xpPercent`, `xpBarLabel` — derived XP progress values |
| `effect()` | Body scroll-lock when mobile menu opens |
| `@for` control flow | Nav items loop, subnav items, user menu actions |
| `@if` / `@else` | Auth state (logged in vs out), dropdown open, mobile item expanded |
| `@defer (when ...)` | Horizontal subnavs — only rendered when hovered |
| `@defer (on immediate)` | User panel — deferred but loaded immediately after auth |
| `ChangeDetectionStrategy.OnPush` | Full component — only re-renders on signal changes |
| `host` bindings | `[class.scrolled]` and `[class.mobile-open]` applied to host element |
| `inject()` | `PLATFORM_ID` — SSR-safe browser API usage |
| `standalone: true` | No NgModule required |
| `RouterLink` / `RouterLinkActive` | Lazy-loaded route links throughout |

---

## Accessibility (ARIA)

- `role="banner"` on `<header>`
- `role="navigation"` + `aria-label` on all nav elements
- `role="menubar"` / `role="menuitem"` / `role="menu"` on nav lists
- `aria-haspopup` + `aria-expanded` + `aria-controls` on all triggers
- `role="progressbar"` with `aria-valuenow/min/max` on XP bar
- `role="dialog"` + `aria-modal` on notifications panel
- `role="separator"` on dropdown dividers
- Full keyboard navigation: Enter/Space to open, Escape to close
- `:focus-visible` styles on all interactive elements
- `aria-hidden="true"` on all decorative icons and SVGs
- Reduced motion media query honors `prefers-reduced-motion`

---

## Theming

CSS custom properties in `:root`:
- `--ang-red` / `--ang-red-dark` — Angular brand colors
- `--sf-bg` / `--sf-surface` — Sci-fi dark backgrounds
- `--sf-cyan` — Accent cyan for future use
- `--font-display` (Rajdhani) / `--font-mono` (Share Tech Mono) / `--font-body` (Exo 2)

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `> 1100px` | Full layout |
| `960–1100px` | Condensed nav labels, reduced XP bar width |
| `< 960px` | Mobile drawer — hamburger replaces desktop nav |
| `< 480px` | Reduced padding, smaller logo |

---

## Usage

```typescript
// app.component.html
<app-nav-header />

// app.routes.ts — all routes should be lazy loaded
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  // ...
];
```

---

## Toggle Auth State

To preview both states, toggle in `nav-header.component.ts`:

```typescript
readonly isAuthenticated = signal<boolean>(true);  // logged in
readonly isAuthenticated = signal<boolean>(false); // logged out
```
