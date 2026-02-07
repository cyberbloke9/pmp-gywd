'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [connected] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connected={connected} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
