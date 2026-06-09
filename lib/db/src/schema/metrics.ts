import { pgTable, serial, integer, real, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { serversTable } from "./servers";

export const metricsTable = pgTable("metrics", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  cpuPercent: real("cpu_percent").notNull(),
  memoryUsedMb: real("memory_used_mb").notNull(),
  memoryTotalMb: real("memory_total_mb").notNull(),
  diskUsedGb: real("disk_used_gb").notNull(),
  diskTotalGb: real("disk_total_gb").notNull(),
  uptimeSeconds: integer("uptime_seconds").notNull(),
  networkRxMbps: real("network_rx_mbps"),
  networkTxMbps: real("network_tx_mbps"),
  topProcess: text("top_process"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMetricSchema = createInsertSchema(metricsTable).omit({ id: true, recordedAt: true });
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metricsTable.$inferSelect;
