// ══════════════════════════════════════════════════════════════════════════════
// IDE MODELS — AngularFi Dev Studio
// ══════════════════════════════════════════════════════════════════════════════

export type FileLanguage = 'typescript' | 'html' | 'scss' | 'css' | 'json';
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
  icon: string; // CSS class or emoji for tab icon
  dotColor: string; // Hex color for file type dot
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
  editorWidthPercent: number; // 20–80
  terminalHeightPx: number; // 120–400
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
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
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
    content: `<div class="app-root">
  <div class="hero">
    <div class="hex-logo">A</div>
    <div>
      <h1>AngularFi</h1>
      <p class="subtitle">Live Component Editor & Preview</p>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Counter Demo</div>
    <div class="counter-row">
      <button class="btn-icon" (click)="decrement()" aria-label="Decrement">−</button>
      <div class="count-display">
        <div class="count-num">{{ count() }}</div>
        <div class="count-eq">× 2 = {{ doubled() }}</div>
      </div>
      <button class="btn-icon" (click)="increment()" aria-label="Increment">+</button>
    </div>
    <button class="btn-reset" (click)="reset()">Reset</button>
  </div>

  <div class="card">
    <div class="card-title">Features</div>
    <ul class="feature-list">
      @for (feature of features(); track feature.name) {
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          <span class="feature-name">{{ feature.name }}</span>
          <span class="badge" [class.badge--beta]="feature.status === 'beta'">
            {{ feature.status }}
          </span>
        </li>
      }
    </ul>
  </div>
</div>`,
    isDirty: false,
    isReadOnly: false,
    icon: 'html',
    dotColor: '#e34c26',
  },
  {
    id: 'app-scss',
    filename: 'app.component.scss',
    language: 'scss',
    content: `@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&family=Exo+2:wght@400;500;600&display=swap');

:host { display: block; }

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:host {
  background: #080b14;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Exo 2', sans-serif;
  padding: 2rem;
}

.app-root {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hex-logo {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  flex-shrink: 0;
  background: rgba(221, 0, 49, 0.1);
  border: 1.5px solid rgba(221, 0, 49, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Rajdhani', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #dd0031;
  text-shadow: 0 0 12px rgba(221, 0, 49, 0.5);
}

h1 {
  font-family: 'Rajdhani', sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.subtitle {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: #dd0031;
  margin-top: 4px;
}

.card {
  background: #0d1220;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-top-color: rgba(221, 0, 49, 0.3);
  border-radius: 8px;
  padding: 1.25rem;
}

.card-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.75rem;
}

.counter-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 0.75rem;
}

.btn-icon {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  border: 1px solid rgba(221, 0, 49, 0.35);
  background: rgba(221, 0, 49, 0.1);
  color: #dd0031;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;

  &:hover {
    background: rgba(221, 0, 49, 0.22);
    box-shadow: 0 0 14px rgba(221, 0, 49, 0.4);
  }
}

.count-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.count-num {
  font-family: 'Rajdhani', sans-serif;
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
}

.count-eq {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: #00d4ff;
}

.btn-reset {
  display: block;
  margin: 0 auto;
  padding: 5px 20px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: all 0.12s;

  &:hover {
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 255, 255, 0.25);
  }
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 4px;
  transition: background 0.12s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.feature-icon {
  font-size: 10px;
  color: #dd0031;
  opacity: 0.6;
}

.feature-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.badge {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.25);
  color: #00d4ff;
}

.badge--beta {
  background: rgba(255, 183, 0, 0.1);
  border-color: rgba(255, 183, 0, 0.25);
  color: #ffb700;
}`,
    isDirty: false,
    isReadOnly: false,
    icon: 'scss',
    dotColor: '#cc6699',
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
  terminalHeightPx: 0,
};
