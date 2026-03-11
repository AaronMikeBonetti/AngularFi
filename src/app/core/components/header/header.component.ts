import {
  Component,
  signal,
  computed,
  effect,
  inject,
  OnDestroy,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem, UserMenuAction, UserProfile, SubNavItem } from '../../models/header.model';
import { NAV_ITEMS, USER_MENU_ACTIONS } from '../../util/constants/header.constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.scrolled]': 'isScrolled()',
    '[class.mobile-open]': 'mobileMenuOpen()',
  },
})
export class HeaderComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  // ── Auth & User State ──
  readonly isAuthenticated = signal<boolean>(true); // toggle to false to see logged-out state

  readonly user = signal<UserProfile>({
    displayName: 'Nyx Voss',
    level: 42,
    levelTitle: 'Neural Architect',
    xp: 7340,
    xpToNextLevel: 10000,
    avatarUrl: null,
    notificationCount: 3,
  });

  // ── XP Progress Computed ──
  readonly xpPercent = computed(() => {
    const u = this.user();
    return Math.round((u.xp / u.xpToNextLevel) * 100);
  });

  readonly xpBarLabel = computed(
    () => `${this.user().xp.toLocaleString()} / ${this.user().xpToNextLevel.toLocaleString()} XP`
  );

  // ── Navigation Data ──
  readonly navItems = signal<NavItem[]>(NAV_ITEMS);
  readonly userMenuActions = signal<UserMenuAction[]>(USER_MENU_ACTIONS);

  // ── Active Hover Subnav ──
  readonly activeSubNav = signal<string | null>(null);
  private subNavTimer: ReturnType<typeof setTimeout> | null = null;

  // ── User Dropdown ──
  readonly userDropdownOpen = signal<boolean>(false);

  // ── Mobile Menu ──
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly mobileExpandedItem = signal<string | null>(null);

  // ── Scroll State ──
  readonly isScrolled = signal<boolean>(false);

  // ── Notifications Panel ──
  readonly notificationsPanelOpen = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initScrollListener();
      this.initClickOutsideListener();
    }

    // Effect: close dropdowns on route changes (simplified)
    effect(() => {
      if (this.mobileMenuOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  // ── Scroll Listener ──
  private scrollHandler = () => {
    this.isScrolled.set(window.scrollY > 20);
  };

  private clickOutsideHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('app-header')) {
      this.userDropdownOpen.set(false);
      this.notificationsPanelOpen.set(false);
      this.activeSubNav.set(null);
    }
  };

  private initScrollListener(): void {
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  private initClickOutsideListener(): void {
    document.addEventListener('click', this.clickOutsideHandler);
  }

  // ── SubNav Hover Logic ──
  onNavItemEnter(itemId: string): void {
    if (this.subNavTimer) {
      clearTimeout(this.subNavTimer);
      this.subNavTimer = null;
    }
    this.activeSubNav.set(itemId);
  }

  onNavItemLeave(): void {
    // Delay allows cursor to cross the ::after bridge gap without flickering.
    // The hover-zone wrapper means this only fires when truly leaving the
    // entire trigger+subnav area, so 120ms is plenty.
    this.subNavTimer = setTimeout(() => {
      this.activeSubNav.set(null);
    }, 120);
  }

  isSubNavOpen(itemId: string): boolean {
    return this.activeSubNav() === itemId;
  }

  // ── User Dropdown ──
  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.userDropdownOpen.update((v) => !v);
    this.notificationsPanelOpen.set(false);
  }

  // ── Notifications ──
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationsPanelOpen.update((v) => !v);
    this.userDropdownOpen.set(false);
  }

  // ── Mobile Menu ──
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
    if (!this.mobileMenuOpen()) {
      this.mobileExpandedItem.set(null);
    }
  }

  toggleMobileItem(itemId: string): void {
    this.mobileExpandedItem.update((current) =>
      current === itemId ? null : itemId
    );
  }

  isMobileItemExpanded(itemId: string): boolean {
    return this.mobileExpandedItem() === itemId;
  }

  // ── User Actions ──
  handleUserAction(action: UserMenuAction): void {
    if (action.action === 'logout') {
      this.isAuthenticated.set(false);
      this.userDropdownOpen.set(false);
    }
    // In a real app: inject Router and navigate for route actions
  }

  // ── Keyboard Navigation ──
  onNavKeydown(event: KeyboardEvent, itemId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activeSubNav.set(
        this.activeSubNav() === itemId ? null : itemId
      );
    }
    if (event.key === 'Escape') {
      this.activeSubNav.set(null);
    }
  }

  onDropdownKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.userDropdownOpen.set(false);
    }
  }

  // ── Track by ──
  trackByNavId(_: number, item: NavItem): string {
    return item.id;
  }

  trackByActionId(_: number, action: UserMenuAction): string {
    return action.id;
  }

  trackBySubNavRoute(_: number, item: SubNavItem): string {
    return item.route;
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollHandler);
      document.removeEventListener('click', this.clickOutsideHandler);
    }
    if (this.subNavTimer) clearTimeout(this.subNavTimer);
    document.body.style.overflow = '';
  }
}
