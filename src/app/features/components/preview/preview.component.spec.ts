import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdePreviewComponent } from './preview.component';

describe('IdePreviewComponent', () => {
  let component: IdePreviewComponent;
  let fixture: ComponentFixture<IdePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdePreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
