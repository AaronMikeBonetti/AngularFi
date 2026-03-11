import { NavItem, UserMenuAction } from '../../models/header.model';

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    route: '/dashboard',
    subNav: [
      { label: 'Overview', icon: '⬡', route: '/dashboard/overview' },
      { label: 'Analytics', icon: '◈', route: '/dashboard/analytics' },
      { label: 'Activity Feed', icon: '◉', route: '/dashboard/activity' },
      { label: 'Achievements', icon: '✦', route: '/dashboard/achievements' },
    ],
  },
  {
    id: 'courses',
    label: 'Courses',
    route: '/courses',
    subNav: [
      { label: 'Browse All', icon: '⬡', route: '/courses/browse' },
      { label: 'My Learning', icon: '◈', route: '/courses/my-learning' },
      { label: 'Certificates', icon: '◉', route: '/courses/certificates' },
      { label: 'Bookmarks', icon: '✦', route: '/courses/bookmarks' },
    ],
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    route: '/roadmap',
    subNav: [
      { label: 'Learning Paths', icon: '⬡', route: '/roadmap/paths' },
      { label: 'Skill Trees', icon: '◈', route: '/roadmap/skills' },
      { label: 'Milestones', icon: '◉', route: '/roadmap/milestones' },
      { label: 'Career Tracks', icon: '✦', route: '/roadmap/careers' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    route: '/pricing',
    subNav: [
      { label: 'Plans', icon: '⬡', route: '/pricing/plans' },
      { label: 'Enterprise', icon: '◈', route: '/pricing/enterprise' },
      { label: 'Student Discount', icon: '◉', route: '/pricing/student' },
      { label: 'Compare', icon: '✦', route: '/pricing/compare' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    route: '/community',
    subNav: [
      { label: 'Forums', icon: '⬡', route: '/community/forums' },
      { label: 'Discord', icon: '◈', route: '/community/discord' },
      { label: 'Events', icon: '◉', route: '/community/events' },
      { label: 'Mentors', icon: '✦', route: '/community/mentors' },
    ],
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    route: '/leaderboard',
    subNav: [
      { label: 'Global Rank', icon: '⬡', route: '/leaderboard/global' },
      { label: 'Weekly Top', icon: '◈', route: '/leaderboard/weekly' },
      { label: 'My Rank', icon: '◉', route: '/leaderboard/my-rank' },
      { label: 'Challenges', icon: '✦', route: '/leaderboard/challenges' },
    ],
  },
];

export const USER_MENU_ACTIONS: UserMenuAction[] = [
  { id: 'profile', label: 'My Profile', icon: '◉', route: '/profile' },
  { id: 'settings', label: 'Settings', icon: '⚙', route: '/settings' },
  { id: 'billing', label: 'Billing', icon: '◈', route: '/billing' },
  { id: 'divider-1', label: '', icon: '', divider: true },
  { id: 'help', label: 'Help & Docs', icon: '?', route: '/help' },
  { id: 'divider-2', label: '', icon: '', divider: true },
  { id: 'logout', label: 'Sign Out', icon: '⏻', action: 'logout' },
];
