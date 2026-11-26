import { NormalizedSession } from "@/src/types/session";

const DB_NAME = "harness-replay-db";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

interface StoredSessionRecord {
  id: string;
  savedAt: number;
  session: NormalizedSession;
}

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export function openSessionDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

export async function getAllSessionsFromDb(): Promise<NormalizedSession[]> {
  if (!hasIndexedDb()) return [];
  try {
    const db = await openSessionDb();
    return await new Promise<NormalizedSession[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result as StoredSessionRecord[]) ?? [];
        records.sort((a, b) => b.savedAt - a.savedAt);
        resolve(records.map((r) => r.session));
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  } catch {
    return [];
  }
}

export async function putSessionsInDb(sessions: NormalizedSession[]): Promise<boolean> {
  if (!hasIndexedDb() || sessions.length === 0) return sessions.length === 0;
  try {
    const db = await openSessionDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();
      sessions.forEach((session, idx) => {
        store.put({
          id: session.id,
          savedAt: now - idx,
          session,
        } satisfies StoredSessionRecord);
      });
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function deleteSessionFromDb(id: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openSessionDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore IndexedDB delete errors
  }
}
