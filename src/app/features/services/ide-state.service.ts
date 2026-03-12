// ══════════════════════════════════════════════════════════════════════════════
// IDE STATE SERVICE — AngularFi Dev Studio
// Central reactive store for all IDE state using Angular 21 signals.
// ══════════════════════════════════════════════════════════════════════════════

import {
  Injectable,
  signal,
  computed,
  effect,
  linkedSignal,
} from '@angular/core';
import type {
  IdeFile,
  EditorSettings,
  PanelSizes,
  LayoutMode,
  RunStatus,
  CursorPosition,
} from '../models/ide.model';
import {
  DEFAULT_FILES,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_PANEL_SIZES,
} from '../models/ide.model';

const STORAGE_KEY_FILES    = 'ngfi_ide_files';
const STORAGE_KEY_SETTINGS = 'ngfi_ide_settings';

@Injectable({ providedIn: 'root' })
export class IdeStateService {

  // ── Files ─────────────────────────────────────────────────────────────────
  readonly files = signal<IdeFile[]>(this.loadFiles());
  readonly activeFileId = signal<string>(this.files()[0]?.id ?? '');

  readonly activeFile = computed(() =>
    this.files().find(f => f.id === this.activeFileId()) ?? null
  );

  readonly dirtyFileCount = computed(() =>
    this.files().filter(f => f.isDirty).length
  );

  readonly hasUnsavedChanges = computed(() => this.dirtyFileCount() > 0);

  // ── Run / Build ───────────────────────────────────────────────────────────
  readonly runStatus = signal<RunStatus>('idle');
  readonly lastBuildDurationMs = signal<number>(0);
  readonly previewDoc = signal<string | null>(null);

  readonly isRunning = computed(() =>
    this.runStatus() === 'compiling' || this.runStatus() === 'running'
  );
  readonly lastRunSuccess = computed(() => this.runStatus() === 'success');

  // ── Layout ────────────────────────────────────────────────────────────────
  readonly layoutMode = signal<LayoutMode>('split');
  readonly panelSizes = signal<PanelSizes>({ ...DEFAULT_PANEL_SIZES });

  // Derived editor width in % (clamped 20–80)
  readonly editorWidth = computed(() => {
    const mode = this.layoutMode();
    if (mode === 'editor-focus')  return 75;
    if (mode === 'preview-focus') return 25;
    return this.panelSizes().editorWidthPercent;
  });

  // ── Editor ────────────────────────────────────────────────────────────────
  readonly settings = signal<EditorSettings>(this.loadSettings());
  readonly cursorPosition = signal<CursorPosition>({ line: 1, col: 1 });

  // ── Preview ───────────────────────────────────────────────────────────────
  readonly previewTheme = signal<'dark' | 'light'>('dark');
  readonly previewScale = signal<number>(1);

  constructor() {
    // Auto-save files to localStorage on change
    effect(() => {
      const files = this.files();
      try {
        const serializable = files.map(f => ({
          id: f.id, filename: f.filename, language: f.language,
          content: f.content, isReadOnly: f.isReadOnly,
          isDirty: false, // never persist dirty flag
          icon: f.icon, dotColor: f.dotColor,
        }));
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(serializable));
      } catch { /* quota exceeded, ignore */ }
    });

    // Auto-save settings
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings()));
      } catch { /* ignore */ }
    });
  }

  // ── File Operations ───────────────────────────────────────────────────────

  setActiveFile(id: string): void {
    this.activeFileId.set(id);
  }

  updateFileContent(id: string, content: string): void {
    this.files.update(files =>
      files.map(f => f.id === id ? { ...f, content, isDirty: true } : f)
    );
  }

  markFileSaved(id: string): void {
    this.files.update(files =>
      files.map(f => f.id === id ? { ...f, isDirty: false } : f)
    );
  }

  resetAllFiles(): void {
    this.files.set(DEFAULT_FILES.map(f => ({ ...f })));
    this.activeFileId.set(DEFAULT_FILES[0].id);
    this.runStatus.set('idle');
    this.previewDoc.set(null);
    try { localStorage.removeItem(STORAGE_KEY_FILES); } catch { /* ignore */ }
  }

  // ── Layout Operations ─────────────────────────────────────────────────────

  setLayoutMode(mode: LayoutMode): void {
    this.layoutMode.set(mode);
  }

  setEditorWidth(percent: number): void {
    this.panelSizes.update(s => ({
      ...s,
      editorWidthPercent: Math.max(20, Math.min(80, percent)),
    }));
  }

  setTerminalHeight(px: number): void {
    this.panelSizes.update(s => ({
      ...s,
      terminalHeightPx: Math.max(80, Math.min(480, px)),
    }));
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  updateSettings(partial: Partial<EditorSettings>): void {
    this.settings.update(s => ({ ...s, ...partial }));
  }

  // ── Run State ─────────────────────────────────────────────────────────────

  setRunStatus(status: RunStatus): void {
    this.runStatus.set(status);
  }

  setPreviewDoc(doc: string | null): void {
    this.previewDoc.set(doc);
  }

  // ── Persistence helpers ───────────────────────────────────────────────────

  private loadFiles(): IdeFile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FILES);
      if (raw) {
        const parsed = JSON.parse(raw) as IdeFile[];
        // Validate structure and merge any missing defaults
        if (Array.isArray(parsed) && parsed.every(f => f.id && f.language)) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_FILES.map(f => ({ ...f }));
  }

  private loadSettings(): EditorSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) {
        return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(raw) };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
}
