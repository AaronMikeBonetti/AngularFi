import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

@Component({
  selector: 'app-ide-terminal',
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
})
export class IdeTerminalComponent implements OnInit, OnDestroy {
  @ViewChild('terminal', { static: true }) terminalRef!: ElementRef;

  private terminal: Terminal = new Terminal({
    cols: 80,
    rows: 24,
    cursorBlink: true,
  });

  private fitAddon: FitAddon = new FitAddon();

  ngOnInit() {
    this.initTerminal();
    this.setupCommandPrompt();
  }

  ngOnDestroy() {
    this.terminal.dispose();
  }

  private initTerminal() {
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalRef.nativeElement);
    this.fitAddon.fit();
  }

  private setupCommandPrompt() {
    this.terminal.onKey((e) => {
      const printable =
        !e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey;

      if (e.key === 'Enter') {
        this.executeCommand();
      } else if (e.key === 'Backspace') {
        if (this.terminal.buffer.active.cursorX > 2) {
          this.terminal.write('\b \b');
        }
      } else if (printable) {
        this.terminal.write(e.key);
      }
    });

    this.terminal.write('$ ');
  }

  private executeCommand() {
    const line = this.terminal.buffer.active.getLine(
      this.terminal.buffer.active.cursorY,
    );
    if (line) {
      const command = line.translateToString(false).slice(2);
      this.terminal.write('\r\n');
          // Execute the command and display the output
    this.terminal.write('Command executed: ' + command + '\r\n');
    this.terminal.write('$ ');
    }


  }
}
