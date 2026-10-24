import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BrandKit } from '../types';
import { DEFAULT_BRAND_KITS } from '../utils/enterpriseLogic';

const BRAND_KITS_STORAGE_KEY = 'b2cmail_enterprise_brand_kits_v3';
const ACTIVE_BRAND_KIT_ID_KEY = 'b2cmail_active_brand_kit_id_v3';
const FIRESTORE_BRAND_KITS_COLLECTION = 'b2cmail_brand_kits_v3';
const LEGACY_DEMO_BRAND_KIT_IDS = new Set([
  'brand-technova',
  'brand-lumiere',
  'brand-fincore',
]);

let cachedDb: Firestore | null = null;

function getDbSafe(): Firestore | null {
  if (cachedDb) return cachedDb;
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    cachedDb = getFirestore(app);
    return cachedDb;
  } catch {
    return null;
  }
}

export function loadLocalBrandKits(): BrandKit[] {
  try {
    const raw = localStorage.getItem(BRAND_KITS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (k: BrandKit) => k && k.id && !LEGACY_DEMO_BRAND_KIT_IDS.has(k.id)
        );
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_BRAND_KITS;
}

export function saveLocalBrandKits(kits: BrandKit[]): void {
  try {
    localStorage.setItem(BRAND_KITS_STORAGE_KEY, JSON.stringify(kits));
  } catch {
    // ignore storage errors
  }
}

export function loadActiveBrandKitId(): string {
  try {
    const stored = localStorage.getItem(ACTIVE_BRAND_KIT_ID_KEY) || '';
    if (LEGACY_DEMO_BRAND_KIT_IDS.has(stored)) return '';
    return stored;
  } catch {
    return '';
  }
}

export function saveActiveBrandKitId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_BRAND_KIT_ID_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Sync Brand Kits from Firestore with automatic local fallback
 */
export async function syncBrandKitsFromCloud(): Promise<{
  kits: BrandKit[];
  source: 'firestore' | 'local_fallback';
}> {
  const localKits = loadLocalBrandKits();
  const db = getDbSafe();
  if (!db) {
    return { kits: localKits, source: 'local_fallback' };
  }
  try {
    const snap = await Promise.race([
      getDocs(collection(db, FIRESTORE_BRAND_KITS_COLLECTION)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2000)
      ),
    ]);
    const cloudKits: BrandKit[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as BrandKit;
      if (
        data &&
        data.id &&
        data.brandName &&
        !LEGACY_DEMO_BRAND_KIT_IDS.has(data.id)
      ) {
        cloudKits.push(data);
      }
    });
    if (cloudKits.length > 0) {
      saveLocalBrandKits(cloudKits);
      return { kits: cloudKits, source: 'firestore' };
    }
    return { kits: localKits, source: 'local_fallback' };
  } catch {
    return { kits: localKits, source: 'local_fallback' };
  }
}

/**
 * Save a Brand Kit to local persistence and attempt non-blocking Firestore sync
 */
export async function persistBrandKit(
  kit: BrandKit,
  currentKits: BrandKit[]
): Promise<{ updatedKits: BrandKit[]; syncedToCloud: boolean }> {
  const exists = currentKits.some((k) => k.id === kit.id);
  const updatedKits = exists
    ? currentKits.map((k) => (k.id === kit.id ? kit : k))
    : [kit, ...currentKits];

  saveLocalBrandKits(updatedKits);

  const db = getDbSafe();
  if (!db) {
    return { updatedKits, syncedToCloud: false };
  }

  try {
    await Promise.race([
      setDoc(doc(db, FIRESTORE_BRAND_KITS_COLLECTION, kit.id), kit, { merge: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timeout')), 1500)
      ),
    ]);
    return { updatedKits, syncedToCloud: true };
  } catch {
    return { updatedKits, syncedToCloud: false };
  }
}

export async function removeBrandKit(
  kitId: string,
  currentKits: BrandKit[]
): Promise<BrandKit[]> {
  const filtered = currentKits.filter((k) => k.id !== kitId);
  saveLocalBrandKits(filtered);

  const db = getDbSafe();
  if (db) {
    try {
      await Promise.race([
        deleteDoc(doc(db, FIRESTORE_BRAND_KITS_COLLECTION, kitId)),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    } catch {
      // fallback silently
    }
  }
  return filtered;
}
