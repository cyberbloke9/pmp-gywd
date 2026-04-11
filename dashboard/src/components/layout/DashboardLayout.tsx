'use client';

import Sidebar from './Sidebar';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const ws = useWebSocket();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        connected={ws.connected}
        reconnecting={ws.reconnecting}
        mode={ws.connected ? 'gateway' : ws.reconnecting ? 'reconnecting' : 'disconnected'}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
