// ══════════════════════════════════════════════════════════════════════════════
// IDE COMPONENT — AngularFi Dev Studio
// Root orchestrator. Wires editor ↔ state ↔ compiler ↔ preview ↔ terminal.
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component,
  ViewChild,
  signal,
  computed,
  effect,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { IdeStateService } from '../../services/ide-state.service';
import { IdeCompilerService } from '../../services/ide-compiler.service';
import { IdeEditorComponent } from '../editor/editor.component';
import { IdePreviewComponent } from '../preview/preview.component';
import { IdeTerminalComponent } from '../terminal/terminal.component';
import type { IdeFile, LayoutMode, RunStatus, TerminalLog } from '../../models/ide.model';

// TypeScript compiler (loaded via script tag in index.html)
declare const ts: typeof import('typescript');

@Component({
  selector: 'app-ide',
  standalone: true,
  imports: [IdeEditorComponent, IdePreviewComponent, IdeTerminalComponent],
  templateUrl: './ide.component.html',
  styleUrl: './ide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeComponent implements OnInit, OnDestroy {
  @ViewChild(IdeEditorComponent) private editor?: IdeEditorComponent;
  @ViewChild(IdePreviewComponent) private preview?: IdePreviewComponent;

  public readonly state = inject(IdeStateService);
  public readonly compiler = inject(IdeCompilerService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Expose state to template ───────────────────────────────────────────
  readonly files = this.state.files;
  readonly activeFileId = this.state.activeFileId;
  readonly activeFile = this.state.activeFile;
  readonly settings = this.state.settings;
  readonly runStatus = this.state.runStatus;
  readonly isRunning = this.state.isRunning;
  readonly previewDoc = this.state.previewDoc;
  readonly cursorPos = this.state.cursorPosition;
  readonly layoutMode = this.state.layoutMode;
  readonly editorWidth = this.state.editorWidth;
  readonly panelSizes = this.state.panelSizes;
  readonly logs = this.compiler.logs;
  readonly dirtyCount = this.state.dirtyFileCount;

  // ── Derived ────────────────────────────────────────────────────────────
  readonly runBtnLabel = computed(() => {
    switch (this.runStatus()) {
      case 'compiling':
        return 'Compiling…';
      case 'running':
        return 'Running…';
      default:
        return 'Run';
    }
  });

  readonly statusText = computed(() => {
    const s = this.runStatus();
    const dirty = this.dirtyCount();
    if (s === 'compiling') return 'Compiling TypeScript…';
    if (s === 'running') return 'Bootstrapping Angular…';
    if (s === 'error') return 'Build failed';
    if (s === 'success') return 'Ready';
    if (dirty > 0) return `${dirty} unsaved file${dirty > 1 ? 's' : ''}`;
    return 'Ready';
  });

  // ── Resize drag state ─────────────────────────────────────────────────
  readonly isDraggingH = signal(false); // horizontal (editor/preview split)
  readonly isDraggingV = signal(false); // vertical   (preview/terminal split)

  private dragStartX = 0;
  private dragStartW = 0;
  private dragStartY = 0;
  private dragStartH = 0;
  private container: HTMLElement | null = null;

  // ── Settings panel ─────────────────────────────────────────────────────
  readonly settingsOpen = signal(false);

  // ── Keyboard shortcut list ─────────────────────────────────────────────
  readonly shortcutsOpen = signal(false);

  // ── TypeScript available ───────────────────────────────────────────────
  readonly tsReady = signal(false);

  constructor() {
    // Effect: watch run status for status-bar color
    effect(() => {
      const status = this.runStatus();
      // Could trigger host class changes here
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.checkTsCompiler();
    this.registerGlobalKeyboardShortcuts();
  }

  // ── TypeScript compiler check ──────────────────────────────────────────

  private checkTsCompiler(): void {
    if (typeof ts !== 'undefined') {
      this.tsReady.set(true);
      this.compiler.addLog(
        'system',
        `TypeScript ${ts.version} compiler loaded`,
        'init',
      );
    } else {
      this.compiler.addLog(
        'warn',
        'TypeScript compiler not detected. Add CDN script to index.html.',
        'init',
      );
    }
  }

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  private registerGlobalKeyboardShortcuts(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;

      if (meta && e.key === 'Enter') {
        e.preventDefault();
        this.run();
      }
      if (meta && e.key === 's') {
        e.preventDefault();
        this.saveCurrentFile();
      }
      if (meta && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.resetFiles();
      }
      if (e.key === 'Escape') {
        this.settingsOpen.set(false);
        this.shortcutsOpen.set(false);
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  // ── File Operations ────────────────────────────────────────────────────

  selectFile(id: string): void {
    this.state.setActiveFile(id);
  }

  onEditorContentChange(content: string): void {
    const file = this.activeFile();
    if (file) {
      this.state.updateFileContent(file.id, content);
    }
  }

  onCursorChange(pos: { line: number; col: number }): void {
    this.state.cursorPosition.set(pos);
  }

  saveCurrentFile(): void {
    const file = this.activeFile();
    if (file) {
      this.state.markFileSaved(file.id);
      this.compiler.addLog('system', `Saved ${file.filename}`, 'editor');
    }
  }

  resetFiles(): void {
    if (confirm('Reset all files to defaults? Unsaved changes will be lost.')) {
      this.state.resetAllFiles();
      this.compiler.clearLogs();
      this.compiler.addLog('system', 'Files reset to defaults', 'ide');
    }
  }

  // ── Run / Build ────────────────────────────────────────────────────────

  async run(): Promise<void> {
    if (this.isRunning()) return;

    this.state.setRunStatus('compiling');
    this.state.setPreviewDoc(null);
    this.compiler.clearLogs();

    const result = await this.compiler.build(this.files());

    if (!result.success || !result.iframeDoc) {
      this.state.setRunStatus('error');
      this.compiler.addLog(
        'error',
        `Build failed after ${result.durationMs}ms — ${result.errors.length} error(s)`,
        'compiler',
      );
      return;
    }

    this.state.setRunStatus('running');
    this.state.setPreviewDoc(result.iframeDoc);
    this.state.lastBuildDurationMs.set(result.durationMs);

    // Mark all files as saved after successful build
    for (const f of this.files()) {
      this.state.markFileSaved(f.id);
    }

    // Status transitions to 'success' once iframe fires 'ready' postMessage
    // Handled in preview component, we listen via onPreviewReady
  }

  onPreviewReady(): void {
    this.state.setRunStatus('success');
  }

  onPreviewError(message: string): void {
    this.state.setRunStatus('error');
    this.compiler.addLog('error', `[Preview] ${message}`, 'runtime');
  }

  onConsoleMessage(log: TerminalLog): void {
    this.compiler.logs.update((prev) => [...prev, log]);
  }

  // ── Layout ─────────────────────────────────────────────────────────────

  setLayoutMode(mode: LayoutMode): void {
    this.state.setLayoutMode(mode);
  }

  // Horizontal drag (editor ↔ preview split)
  startHResize(event: MouseEvent, containerEl: HTMLElement): void {
    event.preventDefault();
    this.isDraggingH.set(true);
    this.dragStartX = event.clientX;
    this.dragStartW = this.panelSizes().editorWidthPercent;
    this.container = containerEl;

    const onMove = (e: MouseEvent) => {
      if (!this.container) return;
      const dx = e.clientX - this.dragStartX;
      const tw = this.container.offsetWidth;
      const newW = this.dragStartW + (dx / tw) * 100;
      this.state.setEditorWidth(newW);
    };

    const onUp = () => {
      this.isDraggingH.set(false);
      this.container = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Vertical drag (preview ↔ terminal split)
  startVResize(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingV.set(true);
    this.dragStartY = event.clientY;
    this.dragStartH = this.panelSizes().terminalHeightPx;

    const onMove = (e: MouseEvent) => {
      const dy = this.dragStartY - e.clientY; // inverted (drag up = bigger terminal)
      const newH = this.dragStartH + dy;
      this.state.setTerminalHeight(newH);
    };

    const onUp = () => {
      this.isDraggingV.set(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Settings ───────────────────────────────────────────────────────────

  toggleSettings(): void {
    this.settingsOpen.update((v) => !v);
    this.shortcutsOpen.set(false);
  }

  toggleShortcuts(): void {
    this.shortcutsOpen.update((v) => !v);
    this.settingsOpen.set(false);
  }

  setFontSize(size: number): void {
    this.state.updateSettings({ fontSize: Math.max(10, Math.min(20, size)) });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  trackFileId(_: number, file: IdeFile): string {
    return file.id;
  }

  ngOnDestroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
  }
}
