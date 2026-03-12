// ══════════════════════════════════════════════════════════════════════════════
// MAIN.TS — AngularFi Dev Studio
// Bootstraps with zoneless change detection (Angular 18+) and router.
// ══════════════════════════════════════════════════════════════════════════════

import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
  withRouterConfig,
} from '@angular/router';
import {
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { APP_ROUTES }   from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    // Zoneless change detection — signals drive all reactivity
    provideZonelessChangeDetection(),

    // Router with view transitions + component input binding
    provideRouter(
      APP_ROUTES,
      withComponentInputBinding(),
      withViewTransitions(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
  ],
}).catch(err => console.error('[Bootstrap]', err));
