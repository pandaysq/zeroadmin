import { useGetDashboardSummary, useListServers, getGetDashboardSummaryQueryKey, getListServersQueryKey, ServerStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { formatBytes, formatUptime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: 10000
    }
  });

  const { data: servers, isLoading: serversLoading } = useListServers({
    query: {
      queryKey: getListServersQueryKey(),
      refetchInterval: 10000
    }
  });

  const MetricCard = ({ title, value, icon: Icon, colorClass, loading }: any) => (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-2xl font-bold font-mono">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Mission Control</h1>
        <p className="text-muted-foreground text-sm">System overview and critical metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Servers"
          value={summary?.totalServers || 0}
          icon={Server}
          colorClass="text-muted-foreground"
          loading={summaryLoading}
        />
        <MetricCard
          title="Online"
          value={summary?.onlineServers || 0}
          icon={CheckCircle2}
          colorClass="text-primary glow-text-primary"
          loading={summaryLoading}
        />
        <MetricCard
          title="Offline/Warning"
          value={(summary?.offlineServers || 0) + (summary?.warningServers || 0)}
          icon={XCircle}
          colorClass="text-destructive glow-text-destructive"
          loading={summaryLoading}
        />
        <MetricCard
          title="Active Alerts"
          value={summary?.activeAlerts || 0}
          icon={AlertTriangle}
          colorClass={summary?.activeAlerts ? "text-[#f59e0b] glow-warning" : "text-muted-foreground"}
          loading={summaryLoading}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Fleet Status</h2>
          <Link href="/servers" className="text-sm text-primary hover:underline font-mono">
            VIEW ALL →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {serversLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <div className="space-y-2 mt-4">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : servers?.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-dashed rounded-lg border-border/50 bg-black/20">
              <Server className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No servers monitored.</p>
              <Link href="/servers" className="text-primary mt-2 inline-block text-sm font-mono">
                + ADD SERVER
              </Link>
            </div>
          ) : (
            servers?.map((server) => (
              <Link key={server.id} href={`/servers/${server.id}`}>
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all cursor-pointer group hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {server.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">{server.host}</p>
                      </div>
                      <StatusBadge status={server.status as ServerStatus} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
