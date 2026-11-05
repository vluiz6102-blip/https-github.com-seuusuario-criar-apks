const DB_NAME = "pulso90-data";
const DB_VERSION = 1;
const CAREERS_STORE = "careers";
const CATALOG_STORE = "catalog";

export interface StoredCareer<T> {
  key: string;
  savedAt: number;
  payload: T;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAREERS_STORE)) db.createObjectStore(CAREERS_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(CATALOG_STORE)) db.createObjectStore(CATALOG_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local database."));
    request.onblocked = () => reject(new Error("The local database upgrade is blocked by another tab."));
  });
}

export async function persistCareer<T>(key: string, payload: T): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CAREERS_STORE, "readwrite");
      tx.objectStore(CAREERS_STORE).put({ key, savedAt: Date.now(), payload } satisfies StoredCareer<T>);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save the career."));
      tx.onabort = () => reject(tx.error ?? new Error("Career save was aborted."));
    });
  } finally {
    db.close();
  }
}

export async function restoreCareer<T>(key: string): Promise<StoredCareer<T> | null> {
  const db = await openDatabase();
  try {
    return await new Promise<StoredCareer<T> | null>((resolve, reject) => {
      const request = db.transaction(CAREERS_STORE, "readonly").objectStore(CAREERS_STORE).get(key);
      request.onsuccess = () => resolve((request.result as StoredCareer<T> | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not restore the career."));
    });
  } finally {
    db.close();
  }
}

export async function persistCatalog<T>(key: string, payload: T): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CATALOG_STORE, "readwrite");
      tx.objectStore(CATALOG_STORE).put({ key, savedAt: Date.now(), payload } satisfies StoredCareer<T>);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not cache the catalog."));
      tx.onabort = () => reject(tx.error ?? new Error("Catalog cache was aborted."));
    });
  } finally {
    db.close();
  }
}

export async function restoreCatalog<T>(key: string): Promise<StoredCareer<T> | null> {
  const db = await openDatabase();
  try {
    return await new Promise<StoredCareer<T> | null>((resolve, reject) => {
      const request = db.transaction(CATALOG_STORE, "readonly").objectStore(CATALOG_STORE).get(key);
      request.onsuccess = () => resolve((request.result as StoredCareer<T> | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not restore the catalog."));
    });
  } finally {
    db.close();
  }
}

export async function estimateStorage(): Promise<{usage:number;quota:number;percent:number}|null> {
  const estimate = navigator.storage?.estimate;
  if (!estimate) return null;
  const result = await estimate.call(navigator.storage);
  const usage = result.usage ?? 0;
  const quota = result.quota ?? 0;
  return { usage, quota, percent: quota ? Math.round(usage / quota * 1000) / 10 : 0 };
}
