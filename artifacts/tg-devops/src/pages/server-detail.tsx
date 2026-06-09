import { useParams, Link } from "wouter";
import {
  useGetServer,
  getGetServerQueryKey,
  useGetServerMetrics,
  getGetServerMetricsQueryKey,
  useGetMetricsHistory,
  getGetMetricsHistoryQueryKey,
  useListServerAlerts,
  getListServerAlertsQueryKey,
  useUpdateServer,
  useResolveAlert,
  useAnalyzeAlert,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  ChevronLeft,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Bot,
  Loader2,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { formatBytes, formatUptime, formatDate, cn } from "@/lib/utils";
import {
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ServerForm } from "@/components/server-form";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ServerDetail() {
  const { id } = useParams();
  const serverId = parseInt(id || "0", 10);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [aiResults, setAiResults] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: server, isLoading: serverLoading } = useGetServer(serverId, {
    query: {
      enabled: !!serverId,
      queryKey: getGetServerQueryKey(serverId),
      refetchInterval: 30000,
    },
  });

  const { data: metrics, isLoading: metricsLoading } = useGetServerMetrics(serverId, {
    query: {
      enabled: !!serverId,
      queryKey: getGetServerMetricsQueryKey(serverId),
      refetchInterval: 10000,
    },
  });

  const { data: history, isLoading: historyLoading } = useGetMetricsHistory(serverId, {
    query: {
      enabled: !!serverId,
      queryKey: getGetMetricsHistoryQueryKey(serverId),
      refetchInterval: 30000,
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useListServerAlerts(serverId, {
    query: {
      enabled: !!serverId,
      queryKey: getListServerAlertsQueryKey(serverId),
      refetchInterval: 15000,
    },
  });

  const resolveAlert = useResolveAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert Resolved" });
        queryClient.invalidateQueries({ queryKey: getListServerAlertsQueryKey(serverId) });
      },
    },
  });

  const analyzeAlert = useAnalyzeAlert({
    mutation: {
      onSuccess: (data, variables) => {
        setAiResults((prev) => ({ ...prev, [variables.id]: data.analysis }));
        toast({ title: "AI Analysis complete" });
      },
      onError: () => {
        toast({ title: "AI Analysis failed", variant: "destructive" });
      },
    },
  });

  if (serverLoading && !server) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!server) return <div className="text-center py-20 text-muted-foreground">Server not found.</div>;

  const memPercent = metrics ? (metrics.memoryUsedMb / metrics.memoryTotalMb) * 100 : 0;
  const diskPercent = metrics ? (metrics.diskUsedGb / metrics.diskTotalGb) * 100 : 0;

  const chartData =
    history
      ?.map((h) => ({
        time: new Date(h.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        cpu: h.cpuPercent,
        memory: (h.memoryUsedMb / h.memoryTotalMb) * 100,
      }))
      .reverse() || [];

  const activeAlerts = alerts?.filter((a) => !a.resolved) || [];
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/servers">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-card/50 hover:bg-primary/20 hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight">{server.name}</h1>
              <StatusBadge status={server.status as any} />
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground font-mono">
              <span>{server.host}</span>
              {server.description && (
                <>
                  <span>•</span>
                  <span>{server.description}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="font-mono text-xs border-border/50 bg-card/50"
              >
                <Settings className="w-4 h-4 mr-2" />
                CONFIGURE
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="font-mono">EDIT SERVER</DialogTitle>
              </DialogHeader>
              <ServerForm
                defaultValues={{
                  id: server.id,
                  name: server.name,
                  host: server.host,
                  description: server.description || "",
                }}
                onSuccess={() => setIsEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Cpu className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                <Cpu className="w-4 h-4 mr-2 text-primary" />
                CPU USAGE
              </h3>
            </div>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <div className="text-3xl font-bold font-mono text-primary glow-text-primary">
                  {metrics?.cpuPercent.toFixed(1)}%
                </div>
                <Progress
                  value={metrics?.cpuPercent || 0}
                  className="h-1.5 mt-4 bg-primary/20"
                  indicatorClassName={cn(
                    "bg-primary",
                    metrics && metrics.cpuPercent > 90 && "bg-destructive"
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <MemoryStick className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                <MemoryStick className="w-4 h-4 mr-2 text-[#8b5cf6]" />
                MEMORY
              </h3>
            </div>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <div className="text-3xl font-bold font-mono text-[#8b5cf6] drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
                  {memPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {formatBytes((metrics?.memoryUsedMb || 0) * 1024 * 1024)} /{" "}
                  {formatBytes((metrics?.memoryTotalMb || 0) * 1024 * 1024)}
                </div>
                <Progress
                  value={memPercent}
                  className="h-1.5 mt-2 bg-[#8b5cf6]/20"
                  indicatorClassName={cn("bg-[#8b5cf6]", memPercent > 90 && "bg-destructive")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <HardDrive className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                <HardDrive className="w-4 h-4 mr-2 text-[#10b981]" />
                DISK
              </h3>
            </div>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <div className="text-3xl font-bold font-mono text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                  {diskPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {metrics?.diskUsedGb.toFixed(1)}GB / {metrics?.diskTotalGb.toFixed(1)}GB
                </div>
                <Progress
                  value={diskPercent}
                  className="h-1.5 mt-2 bg-[#10b981]/20"
                  indicatorClassName={cn("bg-[#10b981]", diskPercent > 90 && "bg-destructive")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Clock className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                <Activity className="w-4 h-4 mr-2 text-[#f59e0b]" />
                UPTIME
              </h3>
            </div>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <div className="text-2xl font-bold font-mono text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                  {metrics ? formatUptime(metrics.uptimeSeconds) : "N/A"}
                </div>
                {metrics?.topProcess && (
                  <div className="mt-4 text-xs text-muted-foreground flex items-center border border-border/50 rounded px-2 py-1 bg-black/20">
                    <span className="font-semibold mr-1">TOP:</span>{" "}
                    <span className="font-mono truncate">{metrics.topProcess}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-mono flex items-center">
            <Activity className="w-4 h-4 mr-2 text-primary" />
            SYSTEM PERFORMANCE HISTORY
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {historyLoading ? (
            <Skeleton className="w-full h-[300px]" />
          ) : chartData.length === 0 ? (
            <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground font-mono">
              NO HISTORY DATA AVAILABLE
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    name="Memory"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMem)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts + AI Analysis */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Recent Alerts
          {criticalAlerts.length > 0 && (
            <Badge className="ml-3 bg-destructive/20 text-destructive border-destructive/30 font-mono text-[10px]">
              {criticalAlerts.length} CRITICAL
            </Badge>
          )}
        </h2>

        {alertsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : alerts?.length === 0 ? (
          <Card className="bg-card/30 border-dashed border-border/50">
            <CardContent className="flex items-center justify-center p-8 text-muted-foreground font-mono text-sm">
              <CheckCircle2 className="w-5 h-5 mr-2 text-primary opacity-50" />
              NO ACTIVE ALERTS FOR THIS SERVER
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts?.map((alert) => {
              const localAnalysis = aiResults[alert.id];
              const analysis = localAnalysis || alert.aiAnalysis;
              const isAnalyzing = analyzeAlert.isPending && analyzeAlert.variables?.id === alert.id;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden",
                    alert.resolved
                      ? "border-border/50 opacity-60"
                      : alert.severity === "critical"
                      ? "border-destructive/50 bg-destructive/5"
                      : alert.severity === "warning"
                      ? "border-[#f59e0b]/50 bg-[#f59e0b]/5"
                      : "border-primary/50 bg-primary/5"
                  )}
                >
                  {/* Alert header */}
                  <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex items-start gap-3">
                      {alert.resolved ? (
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      ) : alert.severity === "critical" ? (
                        <AlertTriangle className="w-5 h-5 text-destructive glow-destructive shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[10px] py-0",
                              alert.resolved
                                ? "text-muted-foreground border-muted-foreground"
                                : alert.severity === "critical"
                                ? "text-destructive border-destructive/30"
                                : alert.severity === "warning"
                                ? "text-[#f59e0b] border-[#f59e0b]/30"
                                : "text-primary border-primary/30"
                            )}
                          >
                            {alert.type.toUpperCase().replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatDate(alert.createdAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-sm",
                            alert.resolved ? "text-muted-foreground line-through" : "text-foreground"
                          )}
                        >
                          {alert.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="font-mono text-xs text-primary border border-primary/20 hover:bg-primary/10 transition-all"
                          onClick={() => analyzeAlert.mutate({ id: alert.id })}
                          disabled={isAnalyzing}
                          data-testid={`button-analyze-${alert.id}`}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          ) : (
                            <Bot className="w-3 h-3 mr-1.5" />
                          )}
                          {analysis ? "RE-ANALYZE" : "ASK AI"}
                        </Button>
                      )}
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-mono text-xs border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                          onClick={() => resolveAlert.mutate({ id: alert.id })}
                          disabled={resolveAlert.isPending}
                          data-testid={`button-resolve-${alert.id}`}
                        >
                          RESOLVE
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis block */}
                  {(analysis || isAnalyzing) && (
                    <div className="border-t border-border/50 bg-black/30 px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-mono text-primary font-semibold tracking-wider">
                          AI SYSADMIN ANALYSIS
                        </span>
                        {isAnalyzing && (
                          <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-1" />
                        )}
                      </div>
                      {isAnalyzing ? (
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                          <Skeleton className="h-3 w-3/5" />
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                          {analysis?.split("\n").map((line, i) =>
                            line.startsWith("$") ? (
                              <div
                                key={i}
                                className="mt-2 flex items-start gap-2 bg-black/40 border border-primary/20 rounded px-3 py-2"
                              >
                                <Terminal className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <code className="text-primary text-xs break-all">{line}</code>
                              </div>
                            ) : (
                              <p key={i}>{line}</p>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logs snippet */}
                  {alert.lastLogs && !alert.resolved && (
                    <div className="border-t border-border/30 bg-black/20 px-4 py-2">
                      <details className="group">
                        <summary className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          <Terminal className="w-3 h-3" />
                          SHOW SYSTEM LOGS
                        </summary>
                        <pre className="mt-2 text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                          {alert.lastLogs}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
