import { Activity, ShieldAlert, Briefcase, Cpu } from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: typeof Activity;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Overview',
    path: '/',
    icon: Activity,
  },
  {
    name: 'Risk Controls',
    path: '/risk',
    icon: ShieldAlert,
  },
  {
    name: 'Positions',
    path: '/positions',
    icon: Briefcase,
  },
  {
    name: 'System Health',
    path: '/system',
    icon: Cpu,
  },
];
