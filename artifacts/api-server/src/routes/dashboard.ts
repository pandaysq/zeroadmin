import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, serversTable, alertsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const servers = await db.select().from(serversTable);
  const totalServers = servers.length;
  const onlineServers = servers.filter((s) => s.status === "online").length;
  const offlineServers = servers.filter((s) => s.status === "offline").length;
  const warningServers = servers.filter((s) => s.status === "warning").length;

  const alerts = await db.select().from(alertsTable).where(eq(alertsTable.resolved, false));
  const activeAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;

  res.json({
    totalServers,
    onlineServers,
    offlineServers,
    warningServers,
    activeAlerts,
    criticalAlerts,
  });
});

export default router;
