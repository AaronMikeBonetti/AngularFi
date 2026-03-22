// ══════════════════════════════════════════════════════════════════════════════
// IDE COMPILER SERVICE — AngularFi Dev Studio
// Transpiles TypeScript and assembles the Angular runner iframe document.
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, signal, computed } from '@angular/core';
import type {
  BuildError,
  BuildResult,
  IdeFile,
  TerminalLog,
  LogLevel,
} from '../models/ide.model';

// TypeScript compiler is loaded as a global from the CDN script tag in index.html
declare const ts: typeof import('typescript');

let logIdCounter = 0;

@Injectable({ providedIn: 'root' })
export class IdeCompilerService {
  // ── Logs ──────────────────────────────────────────────────────────────────
  readonly logs = signal<TerminalLog[]>([]);

  addLog(
    level: LogLevel,
    message: string,
    source?: string,
    detail?: string,
  ): void {
    this.logs.update((prev) => [
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
          const msg =
            typeof diag.messageText === 'string'
              ? diag.messageText
              : diag.messageText.messageText;
          const pos =
            diag.file && diag.start != null
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

    const tsFile = files.find((f) => f.language === 'typescript');
    if (!tsFile) {
      const err = { message: 'No TypeScript file found' };
      errors.push(err);
      this.addLog('error', err.message, 'compiler');
      console.error('[Compiler] No TS file:', err.message);
      return {
        success: false,
        iframeDoc: null,
        errors,
        warnings,
        durationMs: 0,
      };
    }

    // Transpile TS → JS
    this.addLog('info', 'Transpiling TypeScript…', 'tsc');
    const { js, errors: tsErrors } = this.transpileTypeScript(tsFile.content);
    console.log('[Compiler] Transpile result:', {
      jsLength: js.length,
      errCount: tsErrors.length,
    });

    if (tsErrors.length) {
      for (const e of tsErrors) {
        errors.push(e);
        const loc = e.line ? ` (${e.file}:${e.line}:${e.col})` : '';
        this.addLog('error', `${e.message}${loc}`, 'tsc');
        console.error('[Compiler] TS Error:', e.message, loc);
      }
      // Non-fatal TS errors — attempt to continue with partially transpiled output
      this.addLog(
        'warn',
        'TypeScript errors found — attempting to continue…',
        'tsc',
      );
    }

    if (!js.trim()) {
      this.addLog('error', 'Transpilation produced no output.', 'tsc');
      console.error('[Compiler] No JS output from transpilation');
      return {
        success: false,
        iframeDoc: null,
        errors,
        warnings,
        durationMs: Math.round(performance.now() - t0),
      };
    }

    // Inline external template and style files
    this.addLog('info', 'Inlining external templates and styles…', 'bundler');
    const inlinedJs = this.inlineExternalAssets(js, files);

    this.addLog(
      'success',
      `Transpiled in ${Math.round(performance.now() - t0)}ms`,
      'tsc',
    );
    this.addLog('info', 'Assembling Angular runner…', 'bundler');

    const iframeDoc = this.assembleIframeDoc(inlinedJs);
    console.log('[Compiler] Assembled iframe doc:', iframeDoc.length, 'chars');

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

  // ── Inline external assets (templates and styles) ──────────────────────────
  private inlineExternalAssets(js: string, files: IdeFile[]): string {
    let result = js;

    // Create a map of filenames to their content
    const fileMap = new Map<string, string>();
    for (const file of files) {
      fileMap.set(file.filename, file.content);
    }

    // Replace templateUrl: './filename.html' with template: `...content...`
    result = result.replace(
      /templateUrl\s*:\s*['"]\.\/([^'"]+\.html)['"]/g,
      (match, filename) => {
        const content = fileMap.get(filename);
        if (!content) {
          console.warn(`[Compiler] Template file not found: ${filename}`);
          return match;
        }
        // Escape backticks and handle newlines
        const escaped = content
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\r?\n/g, '\\n');
        return `template: \`${escaped}\``;
      },
    );

    // Replace styleUrl: './filename.scss' or styleUrl: './filename.css' with styles: [`...content...`]
    result = result.replace(
      /styleUrl\s*:\s*['"]\.\/([^'"]+\.(scss|css))['"]/g,
      (match, filename) => {
        const content = fileMap.get(filename);
        if (!content) {
          console.warn(`[Compiler] Style file not found: ${filename}`);
          return match;
        }
        // Escape backticks and handle newlines
        const escaped = content
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\r?\n/g, '\\n');
        return `styles: [\`${escaped}\`]`;
      },
    );

    return result;
  }

  private assembleIframeDoc(userJs: string): string {
    // Rewrite Angular bare specifiers to esm.sh URLs
    const patched = this.patchImports(userJs);

    return /* html */ `<!DOCTYPE html>
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
    (async () => {
      try {
        console.log('[iframe] Module script started');

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
          _relay('error')('[Window Error]', e.message, \`\${e.filename}:\${e.lineno}:\${e.colno}\`);
          window.parent.postMessage({
            type: 'error',
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
          }, '*');
        });
        window.addEventListener('unhandledrejection', (e) => {
          const msg = String(e.reason);
          _relay('error')('[Unhandled Promise]', msg);
          window.parent.postMessage({ type: 'error', message: msg }, '*');
        });

        console.log('[iframe] About to load user component...');

        // Import Angular compiler FIRST before importing user code
        // The user code imports @angular modules which need JIT compilation
        console.log('[iframe] Loading Angular compiler...');
        await import('https://esm.sh/@angular/compiler@21.2.2');

        // Now load the user component code
        const userCodeBlob = new Blob([${JSON.stringify(patched)}], { type: 'application/javascript' });
        const userCodeUrl = URL.createObjectURL(userCodeBlob);
        try {
          await import(userCodeUrl);
        } catch (importErr) {
          console.error('[iframe] Failed to import user module:', importErr);
          throw importErr;
        }

        console.log('[iframe] User component loaded, AppComponent =', typeof AppComponent);

        // Verify AppComponent was loaded
        if (typeof AppComponent === 'undefined') {
          throw new Error('AppComponent is not defined after transpilation. Check your component export.');
        }

        console.log('[iframe] Importing Angular...');

        // ── Bootstrap ────────────────────────────────────────────────────────
        const { bootstrapApplication } = await import('https://esm.sh/@angular/platform-browser@21.2.2');
        const { provideZonelessChangeDetection } = await import('https://esm.sh/@angular/core@21.2.2');

        console.log('[iframe] Angular imported, bootstrapping...');

        await bootstrapApplication(AppComponent, {
          providers: [
            provideZonelessChangeDetection(),
          ],
        });

        console.log('[iframe] Bootstrap complete, sending ready');
        window.parent.postMessage({ type: 'ready' }, '*');
      } catch (err) {
        const msg = err?.message ?? String(err);
        const stack = err?.stack ?? '';
        console.error('[Bootstrap]', msg, err);
        window.parent.postMessage({ type: 'error', message: msg }, '*');

        // Show error in the page itself
        document.body.innerHTML = \`
          <div style="font-family:monospace;font-size:12px;padding:20px;color:#ff5c5c;background:#100508;min-height:100vh;white-space:pre-wrap;word-break:break-word;overflow:auto">
            <div style="color:#DD0031;font-size:14px;margin-bottom:10px;font-weight:bold">⚠ Bootstrap Error</div>
            <div>\${msg.replace(/</g,'&lt;')}</div>
            <div style="color:#888;font-size:11px;margin-top:15px;border-top:1px solid rgba(255,0,0,.2);padding-top:10px">Stack trace:\\n\${stack.replace(/</g,'&lt;')}</div>
          </div>\`;
      }
    })();
  </script>
</body>
</html>`;
  }

  // Rewrites bare specifier imports to esm.sh CDN URLs and strips exports
  // so classes are accessible as local variables in the module scope
  private patchImports(js: string): string {
    const ANGULAR_VERSION = '21.2.2';
    const ESM = 'https://esm.sh';

    let patched = js
      // Strip "export" from class/function declarations so they're local vars
      // this allows bootstrap code to access them
      .replace(/export\s+(class|function|const|let|var)\s+/g, '$1 ')
      // @angular/core
      .replace(
        /from\s+['"]@angular\/core['"]/g,
        `from '${ESM}/@angular/core@${ANGULAR_VERSION}'`,
      )
      // @angular/common
      .replace(
        /from\s+['"]@angular\/common['"]/g,
        `from '${ESM}/@angular/common@${ANGULAR_VERSION}'`,
      )
      // @angular/forms
      .replace(
        /from\s+['"]@angular\/forms['"]/g,
        `from '${ESM}/@angular/forms@${ANGULAR_VERSION}'`,
      )
      // @angular/router
      .replace(
        /from\s+['"]@angular\/router['"]/g,
        `from '${ESM}/@angular/router@${ANGULAR_VERSION}'`,
      )
      // @angular/animations
      .replace(
        /from\s+['"]@angular\/animations['"]/g,
        `from '${ESM}/@angular/animations@${ANGULAR_VERSION}'`,
      )
      // @angular/platform-browser
      .replace(
        /from\s+['"]@angular\/platform-browser['"]/g,
        `from '${ESM}/@angular/platform-browser@${ANGULAR_VERSION}'`,
      )
      // rxjs
      .replace(/from\s+['"]rxjs['"]/g, `from '${ESM}/rxjs@7.8.1'`)
      .replace(
        /from\s+['"]rxjs\/operators['"]/g,
        `from '${ESM}/rxjs@7.8.1/operators'`,
      );

    // Add code at the end to expose AppComponent to the parent window
    // This allows us to access it after importing the Blob module
    patched += `\nif (typeof AppComponent !== 'undefined') { window.AppComponent = AppComponent; }`;

    return patched;
  }
}
