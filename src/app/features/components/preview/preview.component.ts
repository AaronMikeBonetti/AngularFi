// ══════════════════════════════════════════════════════════════════════════════
// IDE PREVIEW COMPONENT — AngularFi Dev Studio
// Embedded browser panel. Receives compiled Angular HTML via input signal
// and communicates with the iframe via postMessage.
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  effect,
  input,
  output,
  inject,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { TerminalLog } from '../../models/ide.model';

export type PreviewState = 'empty' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-ide-preview',
  standalone: true,
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdePreviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewFrame', { static: true })
  private frameRef!: ElementRef<HTMLIFrameElement>;

  private readonly platformId = inject(PLATFORM_ID);

  // ── Inputs ──────────────────────────────────────────────────────────────
  readonly iframeDoc = input<string | null>(null);

  // ── Outputs ─────────────────────────────────────────────────────────────
  readonly consoleMessage = output<TerminalLog>();
  readonly previewError = output<string>();
  readonly previewReady = output<void>();

  // ── State ────────────────────────────────────────────────────────────────
  readonly state = signal<PreviewState>('empty');
  readonly errorMessage = signal<string>('');
  readonly loadTimeMs = signal<number>(0);
  readonly currentUrl = signal<string>('about:blank');
  readonly isZoomed = signal<boolean>(false);

  private loadStartTime = 0;
  private messageHandler: ((e: MessageEvent) => void) | null = null;

  constructor() {
    // When iframeDoc changes, load the new doc into the iframe
    effect(() => {
      const doc = this.iframeDoc();
      console.log(
        '[Preview] iframeDoc changed:',
        doc ? `${doc.length} chars` : 'null',
      );
      if (!isPlatformBrowser(this.platformId)) {
        console.log('[Preview] Not browser platform');
        return;
      }

      untracked(() => {
        if (!doc) {
          console.log('[Preview] Doc is null, setting state to empty');
          this.state.set('empty');
          return;
        }
        console.log('[Preview] Loading doc into iframe...');
        this.loadDoc(doc);
      });
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupMessageListener();
    }
  }

  // ── Message Listener ─────────────────────────────────────────────────────

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Only accept messages from our own iframe
      const frame = this.frameRef?.nativeElement;
      if (!frame || event.source !== frame.contentWindow) return;

      const data = event.data as {
        type: string;
        level?: string;
        message?: string;
        filename?: string;
        lineno?: number;
        colno?: number;
      };

      switch (data.type) {
        case 'ready': {
          const dur = Math.round(performance.now() - this.loadStartTime);
          this.loadTimeMs.set(dur);
          this.state.set('ready');
          this.currentUrl.set('preview://localhost/');
          this.previewReady.emit();
          break;
        }

        case 'error': {
          this.state.set('error');
          this.errorMessage.set(data.message ?? 'Unknown error');
          this.previewError.emit(data.message ?? 'Unknown error');
          break;
        }

        case 'console': {
          this.consoleMessage.emit({
            id: String(Date.now()),
            level: (data.level as any) ?? 'info',
            message: data.message ?? '',
            timestamp: new Date(),
            source: 'preview',
          });
          break;
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  private loadDoc(doc: string): void {
    const frame = this.frameRef?.nativeElement;
    console.log('[Preview.loadDoc] frame =', frame ? 'found' : 'NOT FOUND');

    if (!frame) {
      console.error('[Preview] Frame ref is null!');
      return;
    }

    console.log('[Preview.loadDoc] Setting state to loading');
    this.state.set('loading');
    this.errorMessage.set('');
    this.loadStartTime = performance.now();

    console.log('[Preview.loadDoc] Setting srcdoc');
    // Write HTML directly into the iframe via srcdoc
    frame.srcdoc = doc;
    console.log('[Preview.loadDoc] srcdoc set successfully');
  }

  // ── Controls ─────────────────────────────────────────────────────────────

  reload(): void {
    const frame = this.frameRef?.nativeElement;
    if (!frame || !this.iframeDoc()) return;
    this.loadDoc(this.iframeDoc()!);
  }

  openInNewTab(): void {
    const doc = this.iframeDoc();
    if (!doc) return;
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  toggleZoom(): void {
    this.isZoomed.update((v) => !v);
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  readonly statusDot = computed(() => {
    switch (this.state()) {
      case 'ready':
        return '#00ff9d';
      case 'loading':
        return '#ffb700';
      case 'error':
        return '#DD0031';
      default:
        return 'rgba(255,255,255,0.2)';
    }
  });

  readonly statusLabel = computed(() => {
    switch (this.state()) {
      case 'ready':
        return `Ready · ${this.loadTimeMs()}ms`;
      case 'loading':
        return 'Loading…';
      case 'error':
        return 'Error';
      default:
        return 'No preview';
    }
  });

  ngOnDestroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
  }
}
