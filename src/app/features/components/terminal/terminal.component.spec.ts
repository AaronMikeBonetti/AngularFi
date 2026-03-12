import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdeTerminalComponent } from './terminal.component';

describe('IdeTerminalComponent', () => {
  let component: IdeTerminalComponent;
  let fixture: ComponentFixture<IdeTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdeTerminalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdeTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
