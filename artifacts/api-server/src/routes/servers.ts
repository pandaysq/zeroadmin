import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, serversTable, metricsTable, alertsTable } from "@workspace/db";
import {
  CreateServerBody,
  UpdateServerBody,
  UpdateServerParams,
  GetServerParams,
  DeleteServerParams,
  GetServerMetricsParams,
  PushServerMetricsBody,
  PushServerMetricsParams,
  GetMetricsHistoryParams,
  ListServerAlertsParams,
} from "@workspace/api-zod";
import crypto from "crypto";
import { analyzeIncident } from "../lib/openrouter";

const router: IRouter = Router();

router.get("/servers", async (req, res): Promise<void> => {
  const servers = await db.select().from(serversTable).orderBy(desc(serversTable.createdAt));
  res.json(servers);
});

router.post("/servers", async (req, res): Promise<void> => {
  const parsed = CreateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agentToken = crypto.randomBytes(32).toString("hex");
  const [server] = await db
    .insert(serversTable)
    .values({ ...parsed.data, agentToken })
    .returning();
  res.status(201).json(server);
});

router.get("/servers/:id", async (req, res): Promise<void> => {
  const params = GetServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, params.data.id));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.json(server);
});

router.patch("/servers/:id", async (req, res): Promise<void> => {
  const params = UpdateServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [server] = await db
    .update(serversTable)
    .set(parsed.data)
    .where(eq(serversTable.id, params.data.id))
    .returning();
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.json(server);
});

router.delete("/servers/:id", async (req, res): Promise<void> => {
  const params = DeleteServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [server] = await db
    .delete(serversTable)
    .where(eq(serversTable.id, params.data.id))
    .returning();
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/servers/:id/metrics", async (req, res): Promise<void> => {
  const params = GetServerMetricsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [metric] = await db
    .select()
    .from(metricsTable)
    .where(eq(metricsTable.serverId, params.data.id))
    .orderBy(desc(metricsTable.recordedAt))
    .limit(1);
  if (!metric) {
    res.status(404).json({ error: "No metrics found" });
    return;
  }
  res.json(metric);
});

router.post("/servers/:id/metrics", async (req, res): Promise<void> => {
  const params = PushServerMetricsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = PushServerMetricsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [metric] = await db
    .insert(metricsTable)
    .values({ serverId: params.data.id, ...parsed.data })
    .returning();

  const memPercent = parsed.data.memoryUsedMb / parsed.data.memoryTotalMb;
  const isCritical = parsed.data.cpuPercent > 90 || memPercent > 0.9;

  let status = "online";
  if (isCritical) status = "warning";
  await db.update(serversTable).set({ status }).where(eq(serversTable.id, params.data.id));

  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, params.data.id));

  if (parsed.data.cpuPercent > 90) {
    const alertMsg = `CPU usage at ${parsed.data.cpuPercent.toFixed(1)}%${parsed.data.topProcess ? ` — top process: ${parsed.data.topProcess}` : ""}`;
    const [alert] = await db.insert(alertsTable).values({
      serverId: params.data.id,
      type: "cpu_high",
      message: alertMsg,
      severity: "critical",
      resolved: false,
      lastLogs: parsed.data.lastLogs ?? null,
    }).returning();

    // Async AI analysis — don't await, fire-and-forget
    analyzeIncident({
      alertType: "cpu_high",
      message: alertMsg,
      serverName: server?.name ?? `Server #${params.data.id}`,
      cpuPercent: parsed.data.cpuPercent,
      topProcess: parsed.data.topProcess,
      lastLogs: parsed.data.lastLogs,
    }).then((analysis) => {
      db.update(alertsTable)
        .set({ aiAnalysis: analysis })
        .where(eq(alertsTable.id, alert.id))
        .catch(() => {});
    }).catch(() => {});
  }

  if (memPercent > 0.9) {
    const memMsg = `Memory usage at ${(memPercent * 100).toFixed(1)}% (${parsed.data.memoryUsedMb.toFixed(0)} / ${parsed.data.memoryTotalMb.toFixed(0)} MB)`;
    const [alert] = await db.insert(alertsTable).values({
      serverId: params.data.id,
      type: "memory_high",
      message: memMsg,
      severity: "critical",
      resolved: false,
      lastLogs: parsed.data.lastLogs ?? null,
    }).returning();

    analyzeIncident({
      alertType: "memory_high",
      message: memMsg,
      serverName: server?.name ?? `Server #${params.data.id}`,
      memoryPercent: memPercent * 100,
      topProcess: parsed.data.topProcess,
      lastLogs: parsed.data.lastLogs,
    }).then((analysis) => {
      db.update(alertsTable)
        .set({ aiAnalysis: analysis })
        .where(eq(alertsTable.id, alert.id))
        .catch(() => {});
    }).catch(() => {});
  }

  res.status(201).json(metric);
});

router.get("/servers/:id/metrics/history", async (req, res): Promise<void> => {
  const params = GetMetricsHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const metrics = await db
    .select()
    .from(metricsTable)
    .where(eq(metricsTable.serverId, params.data.id))
    .orderBy(desc(metricsTable.recordedAt))
    .limit(60);
  res.json(metrics.reverse());
});

router.get("/servers/:id/alerts", async (req, res): Promise<void> => {
  const params = ListServerAlertsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const alerts = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.serverId, params.data.id))
    .orderBy(desc(alertsTable.createdAt));
  res.json(alerts);
});

export default router;
