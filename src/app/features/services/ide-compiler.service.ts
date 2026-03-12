// ══════════════════════════════════════════════════════════════════════════════
// IDE COMPILER SERVICE — AngularFi Dev Studio
// Transpiles TypeScript and assembles the Angular runner iframe document.
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, signal, computed } from '@angular/core';
import type { BuildError, BuildResult, IdeFile, TerminalLog, LogLevel } from '../models/ide.model';

// TypeScript compiler is loaded as a global from the CDN script tag in index.html
declare const ts: typeof import('typescript');

let logIdCounter = 0;

@Injectable({ providedIn: 'root' })
export class IdeCompilerService {

  // ── Logs ──────────────────────────────────────────────────────────────────
  readonly logs = signal<TerminalLog[]>([]);

  addLog(level: LogLevel, message: string, source?: string, detail?: string): void {
    this.logs.update(prev => [
      ...prev,
      {
        id: String(++logIdCounter),
        level,
        message,
        timestamp: new Date(),
        source,
        detail,
      },
    ]);
  }

  clearLogs(): void {
    this.logs.set([]);
  }

  // ── TypeScript Transpile ──────────────────────────────────────────────────

  transpileTypeScript(source: string): { js: string; errors: BuildError[] } {
    const errors: BuildError[] = [];

    try {
      const result = ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: true,
          emitDecoratorMetadata: false,
          useDefineForClassFields: false,
          strict: false,
        },
        reportDiagnostics: true,
      });

      if (result.diagnostics?.length) {
        for (const diag of result.diagnostics) {
          const msg = typeof diag.messageText === 'string'
            ? diag.messageText
            : diag.messageText.messageText;
          const pos = diag.file && diag.start != null
            ? diag.file.getLineAndCharacterOfPosition(diag.start)
            : null;
          errors.push({
            message: msg,
            file: 'app.component.ts',
            line: pos ? pos.line + 1 : undefined,
            col: pos ? pos.character + 1 : undefined,
          });
        }
      }

      return { js: result.outputText, errors };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { js: '', errors: [{ message: msg, file: 'app.component.ts' }] };
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  async build(files: IdeFile[]): Promise<BuildResult> {
    const t0 = performance.now();
    const errors: BuildError[] = [];
    const warnings: string[] = [];

    this.addLog('system', '▶  Build started…', 'compiler');

    const tsFile = files.find(f => f.language === 'typescript');
    if (!tsFile) {
      const err = { message: 'No TypeScript file found' };
      errors.push(err);
      this.addLog('error', err.message, 'compiler');
      return { success: false, iframeDoc: null, errors, warnings, durationMs: 0 };
    }

    // Transpile TS → JS
    this.addLog('info', 'Transpiling TypeScript…', 'tsc');
    const { js, errors: tsErrors } = this.transpileTypeScript(tsFile.content);

    if (tsErrors.length) {
      for (const e of tsErrors) {
        errors.push(e);
        const loc = e.line ? ` (${e.file}:${e.line}:${e.col})` : '';
        this.addLog('error', `${e.message}${loc}`, 'tsc');
      }
      // Non-fatal TS errors — attempt to continue with partially transpiled output
      this.addLog('warn', 'TypeScript errors found — attempting to continue…', 'tsc');
    }

    if (!js.trim()) {
      this.addLog('error', 'Transpilation produced no output.', 'tsc');
      return {
        success: false, iframeDoc: null, errors,
        warnings, durationMs: Math.round(performance.now() - t0),
      };
    }

    this.addLog('success', `Transpiled in ${Math.round(performance.now() - t0)}ms`, 'tsc');
    this.addLog('info', 'Assembling Angular runner…', 'bundler');

    const iframeDoc = this.assembleIframeDoc(js);

    const dur = Math.round(performance.now() - t0);
    this.addLog('success', `✓  Build complete in ${dur}ms`, 'compiler');

    return {
      success: true,
      iframeDoc,
      errors,
      warnings,
      durationMs: dur,
    };
  }

  // ── Assemble iframe document ──────────────────────────────────────────────
  // Produces a self-contained HTML page that:
  //   1. Loads Angular 17 from esm.sh
  //   2. Patches the user's import paths so Angular imports resolve
  //   3. Bootstraps AppComponent
  //   4. Relays console.log/warn/error back via postMessage

  private assembleIframeDoc(userJs: string): string {
    // Rewrite Angular bare specifiers to esm.sh URLs
    const patched = this.patchImports(userJs);

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Angular Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: #080b14; color: rgba(255,255,255,.9); }
  </style>
</head>
<body>
  <app-root></app-root>

  <script type="module">
    // ── Console relay to parent IDE ──────────────────────────────────────
    const _relay = (level) => (...args) => {
      const msg = args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
        catch { return String(a); }
      }).join(' ');
      window.parent.postMessage({ type: 'console', level, message: msg }, '*');
    };
    const _origLog   = console.log;
    const _origWarn  = console.warn;
    const _origError = console.error;
    console.log   = (...a) => { _origLog(...a);   _relay('log')(...a);   };
    console.warn  = (...a) => { _origWarn(...a);  _relay('warn')(...a);  };
    console.error = (...a) => { _origError(...a); _relay('error')(...a); };

    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      }, '*');
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.parent.postMessage({ type: 'error', message: String(e.reason) }, '*');
    });

    // ── User component code (transpiled) ─────────────────────────────────
    ${patched}

    // ── Bootstrap ────────────────────────────────────────────────────────
    import { bootstrapApplication } from 'https://esm.sh/@angular/platform-browser@17.3.12';
    import { provideExperimentalZonelessChangeDetection } from 'https://esm.sh/@angular/core@17.3.12';

    try {
      // AppComponent must be the default or named export
      const ComponentClass = typeof AppComponent !== 'undefined'
        ? AppComponent
        : window['AppComponent'];

      if (!ComponentClass) throw new Error('AppComponent not found. Make sure your class is named AppComponent.');

      await bootstrapApplication(ComponentClass, {
        providers: [
          provideExperimentalZonelessChangeDetection(),
        ],
      });

      window.parent.postMessage({ type: 'ready' }, '*');
    } catch (err) {
      console.error('[Bootstrap]', err?.message ?? String(err));
      window.parent.postMessage({ type: 'error', message: err?.message ?? String(err) }, '*');

      // Show error in the page itself
      document.body.innerHTML = \`
        <div style="font-family:monospace;font-size:13px;padding:20px;color:#ff5c5c;background:#100508;min-height:100vh">
          <div style="color:#DD0031;font-size:15px;margin-bottom:10px">⚠ Bootstrap Error</div>
          \${(err?.message ?? String(err)).replace(/</g,'&lt;')}
        </div>\`;
    }
  </script>
</body>
</html>`;
  }

  // Rewrites bare specifier imports to esm.sh CDN URLs
  private patchImports(js: string): string {
    const ANGULAR_VERSION = '17.3.12';
    const ESM = 'https://esm.sh';

    return js
      // @angular/core
      .replace(
        /from\s+['"]@angular\/core['"]/g,
        `from '${ESM}/@angular/core@${ANGULAR_VERSION}'`
      )
      // @angular/common
      .replace(
        /from\s+['"]@angular\/common['"]/g,
        `from '${ESM}/@angular/common@${ANGULAR_VERSION}'`
      )
      // @angular/forms
      .replace(
        /from\s+['"]@angular\/forms['"]/g,
        `from '${ESM}/@angular/forms@${ANGULAR_VERSION}'`
      )
      // @angular/router
      .replace(
        /from\s+['"]@angular\/router['"]/g,
        `from '${ESM}/@angular/router@${ANGULAR_VERSION}'`
      )
      // @angular/animations
      .replace(
        /from\s+['"]@angular\/animations['"]/g,
        `from '${ESM}/@angular/animations@${ANGULAR_VERSION}'`
      )
      // @angular/platform-browser
      .replace(
        /from\s+['"]@angular\/platform-browser['"]/g,
        `from '${ESM}/@angular/platform-browser@${ANGULAR_VERSION}'`
      )
      // rxjs
      .replace(
        /from\s+['"]rxjs['"]/g,
        `from '${ESM}/rxjs@7.8.1'`
      )
      .replace(
        /from\s+['"]rxjs\/operators['"]/g,
        `from '${ESM}/rxjs@7.8.1/operators'`
      );
  }
}
