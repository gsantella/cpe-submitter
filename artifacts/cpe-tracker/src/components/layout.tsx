import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, CalendarDays, PlusCircle, Building2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { enabled, username, logout } = useAuth();
  const queryClient = useQueryClient();

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

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              CPE
            </div>
            <span className="text-sidebar-foreground font-semibold tracking-tight text-lg">
              Tracker
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
            })}
          </nav>
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

          {/* Show logout only when auth is enabled */}
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

      {/* Main Content */}
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
