import { RegisteredUserAccount, ThemeMode, WorkspaceRole } from '../types';

const USER_IDB_NAME = 'b2cmail_user_accounts_db_v2';
const USER_IDB_VERSION = 1;
const STORE_USERS = 'users';

const LS_USERS_KEY = 'b2cmail_user_accounts_ls_v2';
const LS_ACTIVE_USER_ID_KEY = 'b2cmail_active_user_id_v2';
const LS_THEME_MODE_KEY = 'b2cmail_theme_mode_v1';

/**
 * Simple deterministic hash for local password verification
 */
export function encodePasswordHash(rawPassword: string): string {
  const trimmed = rawPassword.trim();
  let hash = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `b2c_hash_${(hash >>> 0).toString(16)}_${trimmed.length}`;
}

export const INITIAL_DEMO_USERS: RegisteredUserAccount[] = [];

function openUserIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(USER_IDB_NAME, USER_IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_USERS)) {
          db.createObjectStore(STORE_USERS, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readUsersFromIdb(): Promise<RegisteredUserAccount[]> {
  const db = await openUserIdb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_USERS, 'readonly');
      const store = tx.objectStore(STORE_USERS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as RegisteredUserAccount[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function writeUsersToIdb(users: RegisteredUserAccount[]): Promise<void> {
  const db = await openUserIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      store.clear();
      for (const u of users) {
        store.put(u);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Load all registered accounts from LocalStorage / IndexedDB
 */
export function loadUsersSync(): RegisteredUserAccount[] {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return INITIAL_DEMO_USERS;
  }
  try {
    const raw = window.localStorage.getItem(LS_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_DEMO_USERS;
}

export async function syncUsersFromDatabase(): Promise<RegisteredUserAccount[]> {
  const idbUsers = await readUsersFromIdb();
  if (idbUsers.length > 0) {
    saveUsersSync(idbUsers);
    return idbUsers;
  }
  const localUsers = loadUsersSync();
  await writeUsersToIdb(localUsers);
  return localUsers;
}

export function saveUsersSync(users: RegisteredUserAccount[]): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) return;
  try {
    window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export async function persistUsersToDatabase(
  users: RegisteredUserAccount[]
): Promise<void> {
  saveUsersSync(users);
  await writeUsersToIdb(users);
}

export function loadActiveUserId(): string | null {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(LS_ACTIVE_USER_ID_KEY);
    if (!stored || stored === '__LOGGED_OUT__') return null;
    return stored;
  } catch {
    return null;
  }
}

export function saveActiveUserId(userId: string | null): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) return;
  try {
    window.localStorage.setItem(
      LS_ACTIVE_USER_ID_KEY,
      userId === null ? '__LOGGED_OUT__' : userId
    );
  } catch {
    // ignore
  }
}

export function loadThemeMode(): ThemeMode {
  if (typeof window === 'undefined' || !('localStorage' in window)) return 'light';
  try {
    const v = window.localStorage.getItem(LS_THEME_MODE_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) return;
  try {
    window.localStorage.setItem(LS_THEME_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

/**
 * Pure function: Register a new user account with basic info validation
 */
export function registerAccountRecord(
  existingUsers: RegisteredUserAccount[],
  input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    company: string;
    jobTitle: string;
    role?: WorkspaceRole;
  }
): {
  ok: boolean;
  error?: string;
  user?: RegisteredUserAccount;
  updatedUsers: RegisteredUserAccount[];
} {
  const emailClean = (input.email || '').trim().toLowerCase();
  const fullNameClean = (input.fullName || '').trim();
  const passwordClean = (input.password || '').trim();
  const phoneClean = (input.phone || '').trim();
  const companyClean = (input.company || '').trim();
  const jobTitleClean = (input.jobTitle || '').trim();

  if (!fullNameClean) {
    return {
      ok: false,
      error: 'Vui lòng nhập Họ và tên của bạn.',
      updatedUsers: existingUsers,
    };
  }
  if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return {
      ok: false,
      error: 'Vui lòng nhập địa chỉ Email hợp lệ.',
      updatedUsers: existingUsers,
    };
  }
  if (passwordClean.length < 6) {
    return {
      ok: false,
      error: 'Mật khẩu phải có ít nhất 6 ký tự.',
      updatedUsers: existingUsers,
    };
  }
  if (!companyClean) {
    return {
      ok: false,
      error: 'Vui lòng nhập Tên công ty / Tổ chức.',
      updatedUsers: existingUsers,
    };
  }

  const duplicate = existingUsers.find(
    (u) => u.email.toLowerCase() === emailClean
  );
  if (duplicate) {
    return {
      ok: false,
      error: `Email "${emailClean}" đã được đăng ký. Vui lòng chuyển sang Đăng nhập!`,
      updatedUsers: existingUsers,
    };
  }

  const nowIso = new Date().toISOString();
  const newUser: RegisteredUserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: emailClean,
    passwordHash: encodePasswordHash(passwordClean),
    fullName: fullNameClean,
    phone: phoneClean || 'Chưa cập nhật',
    company: companyClean,
    jobTitle: jobTitleClean || 'Chuyên viên Marketing',
    role: input.role || 'copywriter',
    createdAtIso: nowIso,
    lastLoginAtIso: nowIso,
  };

  const updatedUsers = [newUser, ...existingUsers];
  return {
    ok: true,
    user: newUser,
    updatedUsers,
  };
}

/**
 * Pure function: Authenticate an existing user by email & password
 */
export function authenticateAccountRecord(
  existingUsers: RegisteredUserAccount[],
  email: string,
  password: string
): {
  ok: boolean;
  error?: string;
  user?: RegisteredUserAccount;
  updatedUsers: RegisteredUserAccount[];
} {
  const emailClean = (email || '').trim().toLowerCase();
  const passwordClean = (password || '').trim();

  if (!emailClean || !passwordClean) {
    return {
      ok: false,
      error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.',
      updatedUsers: existingUsers,
    };
  }

  const found = existingUsers.find((u) => u.email.toLowerCase() === emailClean);
  if (!found) {
    return {
      ok: false,
      error: `Không tìm thấy tài khoản với email "${emailClean}". Vui lòng đăng ký mới!`,
      updatedUsers: existingUsers,
    };
  }

  const expectedHash = encodePasswordHash(passwordClean);
  if (found.passwordHash !== expectedHash) {
    return {
      ok: false,
      error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      updatedUsers: existingUsers,
    };
  }

  const updatedUser: RegisteredUserAccount = {
    ...found,
    lastLoginAtIso: new Date().toISOString(),
  };

  const updatedUsers = existingUsers.map((u) =>
    u.id === found.id ? updatedUser : u
  );

  return {
    ok: true,
    user: updatedUser,
    updatedUsers,
  };
}
