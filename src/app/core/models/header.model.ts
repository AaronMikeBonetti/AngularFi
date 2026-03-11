export interface SubNavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

export interface NavItem {
  id: string;
  label: string;
  route: string;
  subNav: SubNavItem[];
}

export interface UserProfile {
  displayName: string;
  level: number;
  levelTitle: string;
  xp: number;
  xpToNextLevel: number;
  avatarUrl: string | null;
  notificationCount: number;
}

export interface UserMenuAction {
  id: string;
  label: string;
  icon: string;
  route?: string;
  action?: string;
  divider?: boolean;
}
