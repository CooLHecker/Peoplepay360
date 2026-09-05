import { db, type SyncQueueItem } from "./db";
import { apiClient } from "./api-client";

const ENTITY_ENDPOINTS: Record<string, string> = {
  attendance: "/attendance",
  timeOff: "/time-off/requests"
};

export async function enqueueOperation(item: Omit<SyncQueueItem, "status" | "createdAt">) {
  await db.syncQueue.put({
    ...item,
    createdAt: new Date().toISOString(),
    status: "PENDING"
  });
}

export async function flushSyncQueue(): Promise<void> {
  const pending = await db.syncQueue.where("status").equals("PENDING").toArray();

  for (const item of pending) {
    const endpoint = ENTITY_ENDPOINTS[item.entity];
    if (!endpoint) continue;

    await db.syncQueue.update(item.operationId, { status: "SYNCING" });

    try {
      await apiClient.post(endpoint, item.payload);
      await db.syncQueue.update(item.operationId, { status: "SYNCED" });
    } catch {
      await db.syncQueue.update(item.operationId, { status: "FAILED" });
    }
  }
}

export function registerConnectivityListeners() {
  window.addEventListener("online", () => {
    void flushSyncQueue();
  });
}
