import { Link, useLocation } from "wouter";
import { AlertCircle, LayoutDashboard, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthCheck } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const { data: health } = useHealthCheck({
    query: {
      refetchInterval: 30000,
    },
  });

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Servers", href: "/servers", icon: Server },
    { name: "Alerts", href: "/alerts", icon: AlertCircle },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden selection:bg-primary/30 dark">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border/50 bg-sidebar/50 backdrop-blur-xl flex flex-col z-20">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border/50 gap-3">
          {/* ZA Avatar with pulse */}
          <div className="relative flex-shrink-0">
            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-lg bg-primary/40 animate-ping" style={{ animationDuration: "2s" }} />
            <span className="absolute inset-0 rounded-lg bg-primary/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
            {/* Avatar */}
            <div className="relative w-9 h-9 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,255,209,0.25)]">
              <span className="font-black text-sm font-mono text-primary tracking-tighter glow-text-primary select-none">
                ZA
              </span>
            </div>
          </div>

          {/* Brand name */}
          <div className="flex flex-col leading-none">
            <span className="font-bold text-base tracking-tight text-foreground">
              Zero<span className="text-primary glow-text-primary">Admin</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              Mission Control
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 group cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 mr-3 w-4 h-4 transition-colors",
                      isActive
                        ? "text-primary glow-text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center text-xs font-mono text-muted-foreground bg-black/40 p-2 rounded border border-white/5">
            <div
              className={cn(
                "w-2 h-2 rounded-full mr-2",
                health?.status === "ok"
                  ? "bg-primary glow-primary"
                  : "bg-destructive glow-destructive"
              )}
            />
            API: {health?.status === "ok" ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-grid-pattern relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
