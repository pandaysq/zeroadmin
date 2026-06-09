import { cn } from "@/lib/utils";
import { ServerStatus } from "@workspace/api-client-react";

interface StatusBadgeProps {
  status: ServerStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles = {
    [ServerStatus.online]: "bg-primary/10 text-primary border-primary/20",
    [ServerStatus.warning]: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
    [ServerStatus.offline]: "bg-destructive/10 text-destructive border-destructive/20",
    [ServerStatus.unknown]: "bg-muted text-muted-foreground border-border",
  };

  const glowStyles = {
    [ServerStatus.online]: "glow-primary",
    [ServerStatus.warning]: "glow-warning",
    [ServerStatus.offline]: "glow-destructive",
    [ServerStatus.unknown]: "",
  };

  const indicatorStyles = {
    [ServerStatus.online]: "bg-primary",
    [ServerStatus.warning]: "bg-[#f59e0b]",
    [ServerStatus.offline]: "bg-destructive",
    [ServerStatus.unknown]: "bg-muted-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
        statusStyles[status],
        className
      )}
    >
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-2",
          indicatorStyles[status],
          glowStyles[status]
        )}
      />
      {status.toUpperCase()}
    </div>
  );
}
