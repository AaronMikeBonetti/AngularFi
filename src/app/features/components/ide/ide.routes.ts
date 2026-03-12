// ══════════════════════════════════════════════════════════════════════════════
// IDE ROUTES — Lazy-loaded feature routes
// ══════════════════════════════════════════════════════════════════════════════

import { Routes } from '@angular/router';

export const IDE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ide.component').then((m) => m.IdeComponent),
    title: 'AngularFi Dev Studio',
  },
];
