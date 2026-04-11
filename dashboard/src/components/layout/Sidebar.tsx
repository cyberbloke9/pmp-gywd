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
  { label: 'Charts', href: '/charts', icon: '📉' },
  { label: 'Analytics', href: '/analytics', icon: '📈' },
  { label: 'Commands', href: '/commands', icon: '🎮' },
  { label: 'Memory', href: '/memory', icon: '🧠', disabled: true },
  { label: 'Settings', href: '/settings', icon: '⚙️', disabled: true },
];

interface SidebarProps {
  connected?: boolean;
  reconnecting?: boolean;
  mode?: 'gateway' | 'reconnecting' | 'disconnected';
}

const STATUS_CONFIG = {
  gateway: { dot: 'bg-gywd-green', label: 'Live (Gateway)', pulse: false },
  reconnecting: { dot: 'bg-yellow-500', label: 'Reconnecting...', pulse: true },
  disconnected: { dot: 'bg-gywd-red', label: 'Local Only', pulse: false },
};

export default function Sidebar({ connected = false, mode = 'disconnected' }: SidebarProps) {
  const pathname = usePathname();
  const status = STATUS_CONFIG[mode] || STATUS_CONFIG.disconnected;

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
            className={`w-2 h-2 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`}
          />
          <span>{status.label}</span>
        </div>
      </div>
    </aside>
  );
}
