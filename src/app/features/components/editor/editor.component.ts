// ══════════════════════════════════════════════════════════════════════════════
// IDE EDITOR COMPONENT — AngularFi Dev Studio
// Wraps CodeMirror 6 with full Angular 21 signal integration.
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  effect,
  inject,
  input,
  output,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  IdeFile,
  EditorSettings,
  CursorPosition,
} from '../../models/ide.model';

// ─── CodeMirror imports ─────────────────────────────────────────────────────
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLineGutter,
  dropCursor,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching,
  indentOnInput,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import {
  autocompletion,
  closeBrackets,
  completionKeymap,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { html as langHTML } from '@codemirror/lang-html';
import { css as langCSS } from '@codemirror/lang-css';
import { json as langJSON } from '@codemirror/lang-json';

import type { Extension } from '@codemirror/state';

@Component({
  selector: 'ide-editor',
  standalone: true,
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true })
  private editorHost!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);

  // ── Inputs ──────────────────────────────────────────────────────────────
  readonly file = input.required<IdeFile>();
  readonly settings = input.required<EditorSettings>();

  // ── Outputs ─────────────────────────────────────────────────────────────
  readonly contentChange = output<string>();
  readonly cursorChange = output<CursorPosition>();
  readonly saveRequested = output<void>();
  readonly runRequested = output<void>();

  // ── Internal state ──────────────────────────────────────────────────────
  readonly isReady = signal(false);
  readonly isLoading = signal(true);

  private view: EditorView | null = null;
  private ignoreNextUpdate = false;

  constructor() {
    // React to file changes — swap content without destroying the editor
    effect(() => {
      console.log(document);
      const f = this.file();
      if (!this.view || !this.isReady()) return;

      untracked(() => {
        const currentDoc = this.view!.state.doc.toString();
        if (currentDoc !== f.content) {
          this.ignoreNextUpdate = true;
          this.view!.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: f.content },
          });
        }
      });
    });

    // React to settings changes — update font size, tab size etc.
    effect(() => {
      const s = this.settings();
      if (!this.view || !this.isReady()) return;
      untracked(() => this.applySettings(s));
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initCodeMirror();
  }

  // ── CodeMirror Initialisation ────────────────────────────────────────────

  private initCodeMirror(): void {
    try {
      const { fontSize, tabSize } = this.settings();
      const file = this.file();

      // Pick language extension
      const langExt = this.resolveLanguage(file.language, {
        javascript,
        langHTML,
        langCSS,
        langJSON,
      });

      // Custom Angular-Fi theme overrides on top of oneDark
      const angularFiTheme = EditorView.theme({
        '&': {
          background: 'transparent',
          height: '100%',
          fontSize: `${fontSize}px`,
        },
        '.cm-content': {
          fontFamily: "'Share Tech Mono', monospace",
          caretColor: '#DD0031',
          padding: '12px 0',
        },
        '.cm-cursor': {
          borderLeftColor: '#DD0031',
          borderLeftWidth: '2px',
        },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
          background: 'rgba(221,0,49,0.15)',
        },
        '.cm-gutters': {
          background: '#070a12',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.2)',
        },
        '.cm-activeLineGutter': {
          background: 'rgba(221,0,49,0.06)',
          color: 'rgba(255,255,255,0.5)',
        },
        '.cm-activeLine': {
          background: 'rgba(221,0,49,0.04)',
        },
        '.cm-foldGutter .cm-gutterElement': {
          color: 'rgba(255,255,255,0.2)',
          padding: '0 4px',
          cursor: 'pointer',
        },
        '.cm-tooltip.cm-tooltip-autocomplete': {
          background: '#0d1220',
          border: '1px solid rgba(221,0,49,0.3)',
          borderRadius: '6px',
          fontSize: `${fontSize}px`,
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
          background: 'rgba(221,0,49,0.15)',
        },
        '.cm-matchingBracket': {
          background: 'rgba(221,0,49,0.2)',
          outline: '1px solid rgba(221,0,49,0.4)',
          borderRadius: '2px',
        },
        '.cm-searchMatch': {
          background: 'rgba(255,183,0,0.15)',
          outline: '1px solid rgba(255,183,0,0.4)',
        },
        '.cm-searchMatch.cm-searchMatch-selected': {
          background: 'rgba(255,183,0,0.3)',
        },
      });

      // Cursor position tracker
      const cursorTracker = EditorView.updateListener.of((update: any) => {
        if (update.selectionSet) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          this.cursorChange.emit({
            line: line.number,
            col: pos - line.from + 1,
          });
        }
        if (update.docChanged && !this.ignoreNextUpdate) {
          this.contentChange.emit(update.state.doc.toString());
        }
        this.ignoreNextUpdate = false;
      });

      // Custom keymaps for IDE actions
      const ideKeymap = keymap.of([
        {
          key: 'Ctrl-s',
          mac: 'Cmd-s',
          run: () => {
            this.saveRequested.emit();
            return true;
          },
        },
        {
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: () => {
            this.runRequested.emit();
            return true;
          },
        },
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
        ...completionKeymap,
        ...closeBracketsKeymap,
        ...searchKeymap,
        ...foldKeymap,
      ]);

      const extensions: Extension[] = [
        // Theme
        oneDark,
        angularFiTheme,
        // Gutter
        lineNumbers(),
        foldGutter(),
        highlightActiveLineGutter(),
        // Editing
        history(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        // Features
        autocompletion(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        // Language
        langExt,
        // Tab size
        EditorState.tabSize.of(tabSize),
        // Keymaps
        ideKeymap,
        // Change listener
        cursorTracker,
      ];

      this.view = new EditorView({
        state: EditorState.create({
          doc: file.content,
          extensions,
        }),
        parent: this.editorHost.nativeElement,
      });

      this.isLoading.set(false);
      this.isReady.set(true);
    } catch (err) {
      console.error('[IdeEditor] Failed to init CodeMirror:', err);
      this.isLoading.set(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private resolveLanguage(
    language: IdeFile['language'],
    exts: {
      javascript: unknown;
      langHTML: unknown;
      langCSS: unknown;
      langJSON: unknown;
    },
  ): Extension {
    const { javascript, langHTML, langCSS, langJSON } = exts as any;
    switch (language) {
      case 'typescript':
        return javascript({ typescript: true, jsx: false });
      case 'html':
        return langHTML();
      case 'css':
        return langCSS();
      case 'json':
        return langJSON();
      default:
        return javascript({ typescript: false });
    }
  }

  private applySettings(settings: EditorSettings): void {
    if (!this.view) return;
    // Font size is applied via theme; re-apply entire theme is heavy,
    // so we use a DOM approach for font size only
    const el = this.editorHost.nativeElement;
    el.style.setProperty('--cm-font-size', `${settings.fontSize}px`);
    this.view.dispatch({
      effects: [],
    });
  }

  // ── Focus ─────────────────────────────────────────────────────────────────
  focus(): void {
    this.view?.focus();
  }

  ngOnDestroy(): void {
    this.view?.destroy();
    this.view = null;
  }
}
