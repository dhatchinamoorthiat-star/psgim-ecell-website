import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FloatingSocialDockComponent } from './floating-social-dock.component';

describe('FloatingSocialDockComponent', () => {
  let component: FloatingSocialDockComponent;
  let fixture: ComponentFixture<FloatingSocialDockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingSocialDockComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingSocialDockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should render exactly 5 floating action items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.dock-item');
    expect(items.length).toBe(5);
  });

  it('should render external social links with correct target, rel, and aria-label', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const instagramLink = compiled.querySelector<HTMLAnchorElement>('[data-id="instagram"]');
    const linkedinLink = compiled.querySelector<HTMLAnchorElement>('[data-id="linkedin"]');
    const youtubeLink = compiled.querySelector<HTMLAnchorElement>('[data-id="youtube"]');

    expect(instagramLink).toBeTruthy();
    expect(instagramLink?.getAttribute('target')).toBe('_blank');
    expect(instagramLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(instagramLink?.getAttribute('aria-label')).toContain('Instagram');

    expect(linkedinLink).toBeTruthy();
    expect(linkedinLink?.getAttribute('target')).toBe('_blank');
    expect(linkedinLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(linkedinLink?.getAttribute('aria-label')).toContain('LinkedIn');

    expect(youtubeLink).toBeTruthy();
    expect(youtubeLink?.getAttribute('target')).toBe('_blank');
    expect(youtubeLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(youtubeLink?.getAttribute('aria-label')).toContain('YouTube');
  });

  it('should render internal application route links for Join Us and NEC 2026', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const joinLink = compiled.querySelector<HTMLAnchorElement>('[data-id="join"]');
    const necLink = compiled.querySelector<HTMLAnchorElement>('[data-id="nec"]');

    expect(joinLink).toBeTruthy();
    expect(joinLink?.getAttribute('href')).toContain('/contact');

    expect(necLink).toBeTruthy();
    expect(necLink?.getAttribute('href')).toContain('/nec');
  });
});
