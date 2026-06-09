import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, alertsTable, serversTable } from "@workspace/db";
import { ResolveAlertParams, AnalyzeAlertParams } from "@workspace/api-zod";
import { analyzeIncident } from "../lib/openrouter";

const router: IRouter = Router();

router.get("/alerts", async (_req, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(alertsTable)
    .orderBy(desc(alertsTable.createdAt));
  res.json(alerts);
});

router.patch("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const params = ResolveAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [alert] = await db
    .update(alertsTable)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(eq(alertsTable.id, params.data.id))
    .returning();
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  res.json(alert);
});

router.post("/alerts/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.id, params.data.id));

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [server] = await db
    .select()
    .from(serversTable)
    .where(eq(serversTable.id, alert.serverId));

  const analysis = await analyzeIncident({
    alertType: alert.type,
    message: alert.message,
    serverName: server?.name ?? `Server #${alert.serverId}`,
    lastLogs: alert.lastLogs ?? undefined,
  });

  await db
    .update(alertsTable)
    .set({ aiAnalysis: analysis })
    .where(eq(alertsTable.id, params.data.id));

  res.json({ alertId: params.data.id, analysis });
});

export default router;
