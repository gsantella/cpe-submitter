import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, CalendarDays, PlusCircle, Building2, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { enabled, username, logout } = useAuth();
  const queryClient = useQueryClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Events", href: "/events", icon: CalendarDays },
    { name: "Chapter", href: "/chapter", icon: Building2 },
  ];

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
  };

  const navLinks = (onNavigate?: () => void) =>
    navigation.map((item) => {
      const isActive =
        location === item.href ||
        (item.href !== "/" && location.startsWith(item.href));
      return (
        <Link
          key={item.name}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
          data-testid={`nav-${item.name.toLowerCase()}`}
        >
          <item.icon className="w-4 h-4" />
          {item.name}
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* ── Mobile top bar ── */}
      <div className="md:hidden h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1 rounded-md"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <span className="relative text-sidebar-foreground font-bold text-lg leading-none tracking-tight">
            ISC2<span className="absolute bottom-0 right-0 w-3 h-0.5 rounded-full" style={{background:'#9AC23C'}}></span>
          </span>
          <span className="text-sidebar-foreground/60 text-xs font-medium mt-1.5">CPE Tracker</span>
        </div>
      </div>

      {/* ── Mobile nav drawer ── */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar border-sidebar-border flex flex-col"
        >
          {/* Drawer header */}
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border flex-shrink-0">
            <div className="flex flex-col">
              <span className="relative text-sidebar-foreground font-bold text-xl leading-none tracking-tight">
                ISC2<span className="absolute bottom-0 right-0 w-3.5 h-0.5 rounded-full" style={{background:'#9AC23C'}}></span>
              </span>
              <span className="text-sidebar-foreground/60 text-xs font-medium mt-1.5">CPE Tracker</span>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto py-6 px-4">
            <nav className="space-y-1">
              {navLinks(() => setMobileNavOpen(false))}
            </nav>
          </div>

          {/* Bottom actions */}
          <div className="p-4 border-t border-sidebar-border space-y-2 flex-shrink-0">
            <Link
              href="/events/new"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
              data-testid="nav-new-event-mobile"
            >
              <PlusCircle className="w-4 h-4" />
              New Event
            </Link>

            {enabled && username && (
              <button
                onClick={() => { handleLogout(); setMobileNavOpen(false); }}
                className="flex items-center justify-center gap-2 w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out ({username})
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex flex-col">
            <span className="relative text-sidebar-foreground font-bold text-xl leading-none tracking-tight">
              ISC2<span className="absolute bottom-0 right-0 w-3.5 h-0.5 rounded-full" style={{background:'#9AC23C'}}></span>
            </span>
            <span className="text-sidebar-foreground/60 text-xs font-medium mt-1.5">CPE Tracker</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">{navLinks()}</nav>
        </div>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            href="/events/new"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            data-testid="nav-new-event"
          >
            <PlusCircle className="w-4 h-4" />
            New Event
          </Link>

          {enabled && username && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              data-testid="nav-logout"
            >
              <LogOut className="w-4 h-4" />
              Sign out ({username})
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
