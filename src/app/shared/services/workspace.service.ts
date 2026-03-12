import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private codeSubject = new Subject<string>();
  code$ = this.codeSubject.asObservable();

  updateCode(code: string) {
    this.codeSubject.next(code);
  }
}
