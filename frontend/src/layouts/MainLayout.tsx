import { Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  BarChart3,
  Settings as SettingsIcon,
  ScrollText,
  LogOut,
  Menu,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { cn, initialsFrom } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Fallback shown only inside the content area while a lazy route chunk
 * loads — deliberately scoped here (not wrapping MainLayout itself) so the
 * sidebar/header never unmount on navigation. A Suspense boundary above the
 * whole app shell would suspend MainLayout too, causing the entire chrome to
 * flash out and back in on every first visit to a not-yet-loaded page.
 */
function RouteFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading page">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/coordinators', label: 'Coordinators', icon: UserCog },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors',
              'hover:bg-sidebar-accent hover:text-white',
              isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="border-b border-sidebar-border px-5 py-4">
      <span className="text-[17px] font-bold tracking-tight text-white">
        HR<span className="text-primary-foreground/70">Onboard</span>
      </span>
    </div>
  );
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar md:flex">
        <SidebarBrand />
        <NavLinks />
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-64 max-w-[80vw] flex-col bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBrand />
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          <div className="border-t border-sidebar-border p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col md:ml-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="hidden text-[15px] font-semibold sm:inline">Digital Onboarding &amp; KYC Portal</span>
            <span className="text-[15px] font-semibold sm:hidden">HR Onboard</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight">{user?.name}</div>
              <div className="text-xs text-muted-foreground">Super Admin</div>
            </div>
            <Avatar>
              <AvatarFallback>{initialsFrom(user?.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
