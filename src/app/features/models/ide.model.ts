// ══════════════════════════════════════════════════════════════════════════════
// IDE MODELS — AngularFi Dev Studio
// ══════════════════════════════════════════════════════════════════════════════

export type FileLanguage = 'typescript' | 'html' | 'scss' | 'json';
export type PanelId = 'editor' | 'preview' | 'terminal';
export type RunStatus = 'idle' | 'compiling' | 'running' | 'success' | 'error';
export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'system';
export type PreviewTheme = 'dark' | 'light';
export type LayoutMode = 'split' | 'editor-focus' | 'preview-focus';

// ─── File System ──────────────────────────────────────────────────────────────

export interface IdeFile {
  id: string;
  filename: string;
  language: FileLanguage;
  content: string;
  isDirty: boolean;
  isReadOnly: boolean;
  icon: string;        // CSS class or emoji for tab icon
  dotColor: string;    // Hex color for file type dot
}

export interface FileSnapshot {
  id: string;
  content: string;
  timestamp: number;
}

// ─── Terminal ─────────────────────────────────────────────────────────────────

export interface TerminalLog {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  source?: string;
  detail?: string;
}

// ─── Build ────────────────────────────────────────────────────────────────────

export interface BuildResult {
  success: boolean;
  iframeDoc: string | null;
  errors: BuildError[];
  warnings: string[];
  durationMs: number;
}

export interface BuildError {
  message: string;
  file?: string;
  line?: number;
  col?: number;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export interface PreviewMessage {
  type: 'ready' | 'error' | 'log' | 'warn' | 'console' | 'navigate';
  payload?: unknown;
}

// ─── Editor State ─────────────────────────────────────────────────────────────

export interface CursorPosition {
  line: number;
  col: number;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  theme: 'one-dark' | 'dracula' | 'github-dark';
}

// ─── IDE Layout ───────────────────────────────────────────────────────────────

export interface PanelSizes {
  editorWidthPercent: number;    // 20–80
  terminalHeightPx: number;      // 120–400
}

// ─── Default Files ────────────────────────────────────────────────────────────

export const DEFAULT_TS_CONTENT = `import {
  Component,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="shell">
      <header class="hero">
        <div class="hex-logo">A</div>
        <div>
          <h1>{{ title() }}</h1>
          <p class="subtitle">Angular 21 · Signals · Standalone</p>
        </div>
      </header>

      <section class="card">
        <h2 class="card-title">Signal Counter</h2>
        <div class="counter-row">
          <button (click)="decrement()" class="btn-icon">−</button>
          <div class="count-display">
            <span class="count-num">{{ count() }}</span>
            <span class="count-eq">doubled = {{ doubled() }}</span>
          </div>
          <button (click)="increment()" class="btn-icon">+</button>
        </div>
        <button (click)="reset()" class="btn-reset">Reset</button>
      </section>

      <section class="card">
        <h2 class="card-title">Angular 21 Features</h2>
        <ul class="feature-list">
          @for (feature of features(); track feature.name) {
            <li class="feature-item">
              <span class="feature-icon">◈</span>
              <span class="feature-name">{{ feature.name }}</span>
              <span class="badge" [class.badge--beta]="feature.status === 'beta'">
                {{ feature.status }}
              </span>
            </li>
          }
        </ul>
      </section>
    </div>
  \`,
  styles: [\`
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&family=Exo+2:wght@400;500;600&display=swap');
    :host { display: block; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080b14; color: rgba(255,255,255,.9); font-family: 'Exo 2', sans-serif; padding: 2rem; }

    .shell { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

    .hero { display: flex; align-items: center; gap: 1rem; }
    .hex-logo {
      width: 50px; height: 50px; border-radius: 8px; flex-shrink: 0;
      background: rgba(221,0,49,.1); border: 1.5px solid rgba(221,0,49,.4);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Rajdhani', sans-serif; font-size: 26px; font-weight: 700;
      color: #DD0031; text-shadow: 0 0 12px rgba(221,0,49,.5);
    }
    h1 { font-family: 'Rajdhani', sans-serif; font-size: 30px; font-weight: 700; line-height: 1; }
    .subtitle { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: #DD0031; margin-top: 4px; }

    .card {
      background: #0d1220; border: 1px solid rgba(255,255,255,.07);
      border-top-color: rgba(221,0,49,.3); border-radius: 8px; padding: 1.25rem;
    }
    .card-title {
      font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 600;
      letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.4);
      margin-bottom: .75rem;
    }

    .counter-row { display: flex; align-items: center; justify-content: center; gap: 2rem; margin-bottom: .75rem; }
    .btn-icon {
      width: 42px; height: 42px; border-radius: 6px; border: 1px solid rgba(221,0,49,.35);
      background: rgba(221,0,49,.1); color: #DD0031; font-size: 22px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all .12s;
    }
    .btn-icon:hover { background: rgba(221,0,49,.22); box-shadow: 0 0 14px rgba(221,0,49,.4); }
    .count-display { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .count-num { font-family: 'Rajdhani', sans-serif; font-size: 52px; font-weight: 700; line-height: 1; }
    .count-eq { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: #00d4ff; }
    .btn-reset {
      display: block; margin: 0 auto; padding: 5px 20px;
      background: none; border: 1px solid rgba(255,255,255,.1); border-radius: 4px;
      color: rgba(255,255,255,.45); font-size: 12px; cursor: pointer;
      text-transform: uppercase; letter-spacing: .06em; transition: all .12s;
    }
    .btn-reset:hover { color: rgba(255,255,255,.8); border-color: rgba(255,255,255,.25); }

    .feature-list { list-style: none; display: flex; flex-direction: column; gap: 3px; }
    .feature-item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 4px; transition: background .12s; }
    .feature-item:hover { background: rgba(255,255,255,.03); }
    .feature-icon { font-size: 10px; color: #DD0031; opacity: .6; }
    .feature-name { flex: 1; font-size: 13px; font-weight: 500; }
    .badge {
      font-family: 'Share Tech Mono', monospace; font-size: 10px;
      padding: 2px 7px; border-radius: 3px; text-transform: uppercase; letter-spacing: .04em;
      background: rgba(0,212,255,.1); border: 1px solid rgba(0,212,255,.25); color: #00d4ff;
    }
    .badge--beta { background: rgba(255,183,0,.1); border-color: rgba(255,183,0,.25); color: #ffb700; }
  \`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title   = signal('AngularFi');
  readonly count   = signal(0);
  readonly doubled = computed(() => this.count() * 2);

  readonly features = signal([
    { name: 'Signals & Computed',  status: 'stable' },
    { name: '@for / @if / @defer', status: 'stable' },
    { name: 'Standalone Components', status: 'stable' },
    { name: 'SSR + Hydration',     status: 'stable' },
    { name: 'linkedSignal()',       status: 'stable' },
    { name: 'resource() API',       status: 'beta'   },
  ]);

  constructor() {
    effect(() => console.log('[Signal] count changed →', this.count()));
  }

  increment() { this.count.update(v => v + 1); }
  decrement() { this.count.update(v => Math.max(0, v - 1)); }
  reset()     { this.count.set(0); }
}
`;

export const DEFAULT_FILES: IdeFile[] = [
  {
    id: 'app-ts',
    filename: 'app.component.ts',
    language: 'typescript',
    content: DEFAULT_TS_CONTENT,
    isDirty: false,
    isReadOnly: false,
    icon: 'ts',
    dotColor: '#3178c6',
  },
  {
    id: 'app-html',
    filename: 'app.component.html',
    language: 'html',
    content: `<!-- This file is only used when templateUrl is referenced -->
<!-- For the default starter, the template is inline in app.component.ts -->
<p>Edit app.component.ts to use this file via templateUrl</p>`,
    isDirty: false,
    isReadOnly: false,
    icon: 'html',
    dotColor: '#e34c26',
  },
  {
    id: 'app-scss',
    filename: 'app.component.scss',
    language: 'scss',
    content: `/* Styles here are only applied when styleUrl is referenced.
   For the default starter, styles are inline in app.component.ts */

:host {
  display: block;
}`,
    isDirty: false,
    isReadOnly: false,
    icon: 'scss',
    dotColor: '#cc6699',
  },
  {
    id: 'app-json',
    filename: 'tsconfig.json',
    language: 'json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false,
    "useDefineForClassFields": false,
    "lib": ["ES2022", "DOM"],
    "skipLibCheck": true
  }
}`,
    isDirty: false,
    isReadOnly: false,
    icon: 'json',
    dotColor: '#f5a623',
  },
];

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  lineNumbers: true,
  theme: 'one-dark',
};

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  editorWidthPercent: 50,
  terminalHeightPx: 220,
};
