const DB_NAME = 'iron_ledger_backup_db';
const STORE_NAME = 'handles';
const KEY = 'backup_dir';

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(handle, KEY);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Upgrade needed didn't trigger because database existed at same version but store was missing
        resolve(null);
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(KEY);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => resolve(null); // Return null on database errors to degrade gracefully
  });
}

export async function removeDirectoryHandle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve();
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(KEY);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function verifyDirectoryPermission(directoryHandle: any, readWrite: boolean): Promise<boolean> {
  const options = { mode: readWrite ? 'readwrite' as const : 'read' as const };
  if ((await directoryHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await directoryHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

export async function writeBackupFile(
  directoryHandle: any,
  data: { members: any[]; payments: any[]; plans: any[]; attendance: any[] },
  gymName?: string
): Promise<string> {
  try {
    // Verify permissions first
    const hasPermission = await verifyDirectoryPermission(directoryHandle, true);
    if (!hasPermission) {
      throw new Error('Permission to write to the backup folder was denied.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const cleanGymName = gymName
      ? gymName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      : 'iron_ledger';
    const fileName = `${cleanGymName}_backup_${todayStr}.json`;
    
    // Create or open the backup file
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    // Write full data as formatted JSON
    const content = JSON.stringify(data, null, 2);
    await writable.write(content);
    await writable.close();
    
    return fileName;
  } catch (err: any) {
    console.error('Error writing local backup file:', err);
    throw err;
  }
}
