import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables'
  );
}

// ── Chunked SecureStore helpers ───────────────────────────────────────────────
// Android EncryptedSharedPreferences (used by expo-secure-store on older builds)
// caps individual values at ~2 048 bytes.  A Supabase session JSON easily exceeds
// this limit with long JWTs + user metadata, causing silent write failures and
// making the user appear "logged out" on the next cold start.
//
// We split large values into 1 800-byte chunks and store them under numbered
// keys (<key>__chunk_0, <key>__chunk_1, …) plus a manifest key (<key>__chunks)
// that records how many chunks to read back.  Small values are stored as-is.
// ─────────────────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 1_800; // bytes (safe below the 2 048-byte limit)

const secureSet = async (key: string, value: string): Promise<void> => {
  if (value.length <= CHUNK_SIZE) {
    // Small value — store directly; clear any stale chunks from a previous large write
    await SecureStore.deleteItemAsync(`${key}__chunks`);
    await SecureStore.setItemAsync(key, value);
    return;
  }

  // Large value — write chunks
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  // Store each chunk, then the manifest
  await Promise.all(
    chunks.map((chunk, idx) => SecureStore.setItemAsync(`${key}__chunk_${idx}`, chunk))
  );
  await SecureStore.setItemAsync(`${key}__chunks`, String(chunks.length));
  // Remove any plain-key value left over from a previous small write
  await SecureStore.deleteItemAsync(key);
};

const secureGet = async (key: string): Promise<string | null> => {
  const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunks`);

  if (chunkCountStr !== null) {
    // Chunked value
    const count = parseInt(chunkCountStr, 10);
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}__chunk_${i}`)
      )
    );
    if (parts.some((p) => p === null)) {
      console.warn('[SecureStore] Missing chunk for key:', key, '— clearing corrupt data');
      await secureRemove(key);
      return null;
    }
    return parts.join('');
  }

  // Plain (small) value
  return SecureStore.getItemAsync(key);
};

const secureRemove = async (key: string): Promise<void> => {
  const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
  if (chunkCountStr !== null) {
    const count = parseInt(chunkCountStr, 10);
    await Promise.all([
      SecureStore.deleteItemAsync(`${key}__chunks`),
      ...Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}__chunk_${i}`)
      ),
    ]);
  }
  await SecureStore.deleteItemAsync(key);
};

/**
 * Session storage implementation for Supabase.
 * • Native: chunked expo-secure-store (handles large JWT sessions safely)
 * • Web:    localStorage (dev only)
 */
const ExpoSecureSessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
        return null;
      }
      return await secureGet(key);
    } catch (error) {
      console.error('[SecureStore] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      await secureSet(key, value);
    } catch (error) {
      console.error('[SecureStore] setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      await secureRemove(key);
    } catch (error) {
      console.error('[SecureStore] removeItem error:', error);
    }
  },
};

/**
 * Supabase client instance with secure session storage
 * Automatically handles session persistence and token refresh
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
