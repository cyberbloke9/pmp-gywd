'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/overview', icon: '📊' },
  { label: 'Memory', href: '/memory', icon: '🧠', disabled: true },
  { label: 'Patterns', href: '/patterns', icon: '🔍', disabled: true },
  { label: 'Analytics', href: '/analytics', icon: '📈', disabled: true },
  { label: 'Settings', href: '/settings', icon: '⚙️', disabled: true },
];

interface SidebarProps {
  connected?: boolean;
}

export default function Sidebar({ connected = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gywd-surface border-r border-gywd-border flex flex-col h-full">
      <div className="p-4 border-b border-gywd-border">
        <h1 className="text-lg font-bold text-gywd-text">GYWD Dashboard</h1>
        <p className="text-xs text-gywd-muted mt-1">Project Intelligence</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const baseClasses = 'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors';
          const activeClasses = isActive
            ? 'bg-gywd-blue/10 text-gywd-blue'
            : item.disabled
            ? 'text-gywd-muted/50 cursor-not-allowed'
            : 'text-gywd-muted hover:text-gywd-text hover:bg-gywd-bg';

          if (item.disabled) {
            return (
              <span key={item.href} className={`${baseClasses} ${activeClasses}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={`${baseClasses} ${activeClasses}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gywd-border">
        <div className="flex items-center gap-2 text-xs text-gywd-muted">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-gywd-green' : 'bg-gywd-red'}`}
          />
          <span>{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>
    </aside>
  );
}
