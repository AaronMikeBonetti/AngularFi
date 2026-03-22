import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdeEditorComponent } from './editor.component';

describe('IdeEditorComponent', () => {
  let component: IdeEditorComponent;
  let fixture: ComponentFixture<IdeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdeEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IdeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
