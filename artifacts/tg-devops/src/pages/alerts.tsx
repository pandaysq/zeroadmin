import { useListAlerts, getListAlertsQueryKey, useResolveAlert } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { formatDate, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AlertsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const { data: alerts, isLoading } = useListAlerts({
    query: {
      queryKey: getListAlertsQueryKey(),
      refetchInterval: 15000
    }
  });

  const resolveAlert = useResolveAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert Resolved" });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      }
    }
  });

  const filteredAlerts = alerts?.filter(a => showResolved || !a.resolved);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center">
            <ShieldAlert className="w-6 h-6 mr-2 text-destructive glow-destructive" />
            Alert Center
          </h1>
          <p className="text-muted-foreground text-sm">System-wide incidents and notifications.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-card/50 border border-border/50 p-2 rounded-md backdrop-blur-sm">
          <Switch 
            id="show-resolved" 
            checked={showResolved} 
            onCheckedChange={setShowResolved} 
          />
          <Label htmlFor="show-resolved" className="text-sm font-mono cursor-pointer">
            SHOW RESOLVED
          </Label>
        </div>
      </div>

      <div className="rounded-md border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[150px] font-mono text-xs">SEVERITY</TableHead>
              <TableHead className="font-mono text-xs">MESSAGE</TableHead>
              <TableHead className="font-mono text-xs">SERVER</TableHead>
              <TableHead className="hidden md:table-cell font-mono text-xs">TIME</TableHead>
              <TableHead className="text-right font-mono text-xs">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredAlerts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mb-3 text-primary opacity-50" />
                    <p className="font-mono">NO ALERTS FOUND</p>
                    <p className="text-sm mt-1">All systems operating within normal parameters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAlerts?.map((alert) => (
                <TableRow 
                  key={alert.id} 
                  className={cn(
                    "border-border/50 transition-colors",
                    alert.resolved ? "opacity-60 bg-transparent hover:bg-white/5" :
                    alert.severity === 'critical' ? "bg-destructive/5 hover:bg-destructive/10" :
                    alert.severity === 'warning' ? "bg-[#f59e0b]/5 hover:bg-[#f59e0b]/10" :
                    "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "font-mono text-[10px]",
                      alert.resolved ? "text-muted-foreground border-muted-foreground" :
                      alert.severity === 'critical' ? "text-destructive border-destructive/50 shadow-[0_0_8px_rgba(220,38,38,0.3)]" :
                      alert.severity === 'warning' ? "text-[#f59e0b] border-[#f59e0b]/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                      "text-primary border-primary/50 shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                    )}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={cn(
                        "font-medium",
                        alert.resolved && "line-through text-muted-foreground"
                      )}>{alert.message}</span>
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">
                        {alert.type.replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/servers/${alert.serverId}`} className="hover:text-primary transition-colors hover:underline font-mono text-sm">
                      {/* Note: The API currently doesn't return serverName in Alert, just serverId. 
                          Ideally the backend would join this. For now we show the ID and link to it. */}
                      SRV-{alert.serverId.toString().padStart(3, '0')}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">
                    {formatDate(alert.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!alert.resolved ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="font-mono text-xs border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                        onClick={() => resolveAlert.mutate({ id: alert.id })}
                        disabled={resolveAlert.isPending}
                      >
                        RESOLVE
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono flex items-center justify-end">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        RESOLVED
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
