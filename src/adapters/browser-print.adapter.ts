import type { PrintPort } from '../ports/print.port';

export class BrowserPrintAdapter implements PrintPort {
  constructor(private readonly target: Pick<Window, 'print'> = window) {}
  print(): void { this.target.print(); }
}
