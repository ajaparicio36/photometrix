import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError, messageOf, request, requestJson, type RequestOptions } from './api';
import { decodeLogin, decodeUser, record, type Decoder, type User } from './contract';

interface Credential {
  accessToken: string;
  expiresAt: number;
}
type AuthState =
  | { status: 'restoring' }
  | { status: 'restore-error'; message: string }
  | { status: 'signed-out'; message?: string }
  | { status: 'signed-in'; user: User; credential: Credential };
interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
  api: <T>(path: string, decode: Decoder<T>, options?: RequestOptions) => Promise<T>;
  pdf: (path: string) => Promise<ArrayBuffer>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'photometrix.user-session.v1';
async function readCredential(): Promise<Credential | null> {
  const raw =
    Platform.OS === 'web'
      ? typeof sessionStorage === 'undefined'
        ? null
        : sessionStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = record(JSON.parse(raw) as unknown);
    if (
      typeof value.accessToken === 'string' &&
      typeof value.expiresAt === 'number' &&
      Number.isFinite(value.expiresAt)
    )
      return { accessToken: value.accessToken, expiresAt: value.expiresAt };
  } catch {
    /* A damaged stored session needs a new login. */
  }
  await writeCredential(null);
  return null;
}
async function writeCredential(value: Credential | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(STORAGE_KEY);
    }
    return;
  }
  if (value) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value));
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}
export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<AuthState>({ status: 'restoring' });
  const tokenRef = useRef<string | null>(null);
  const expire = useCallback(async (token: string): Promise<void> => {
    if (tokenRef.current !== token) return;
    tokenRef.current = null;
    setState({ status: 'signed-out', message: 'Your session has expired. Sign in again.' });
    await writeCredential(null).catch(() => undefined);
  }, []);
  const restore = useCallback(async (): Promise<void> => {
    await Promise.resolve();
    setState({ status: 'restoring' });
    try {
      const credential = await readCredential();
      if (!credential || credential.expiresAt <= Date.now()) {
        await writeCredential(null);
        setState({ status: 'signed-out' });
        return;
      }
      tokenRef.current = credential.accessToken;
      const user = await requestJson('/auth/me', credential.accessToken, decodeUser);
      setState({ status: 'signed-in', user, credential });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await writeCredential(null).catch(() => undefined);
        tokenRef.current = null;
        setState({ status: 'signed-out', message: 'Your session has expired. Sign in again.' });
      } else setState({ status: 'restore-error', message: messageOf(error) });
    }
  }, []);
  useEffect(() => {
    const task = setTimeout(() => void restore(), 0);
    return () => clearTimeout(task);
  }, [restore]);
  useEffect(() => {
    if (state.status !== 'signed-in') return;
    const { credential } = state;
    const check = (): void => {
      if (Date.now() >= credential.expiresAt) void expire(credential.accessToken);
    };
    const timer = setTimeout(
      check,
      Math.min(2147483647, Math.max(0, credential.expiresAt - Date.now())),
    );
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [state, expire]);
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const login = await requestJson('/auth/login', null, decodeLogin, {
      method: 'POST',
      body: { email: email.trim(), password },
    });
    const credential = {
      accessToken: login.accessToken,
      expiresAt: Date.now() + login.expiresIn * 1000,
    };
    await writeCredential(credential);
    tokenRef.current = login.accessToken;
    setState({ status: 'signed-in', user: login.user, credential });
  }, []);
  const signOut = useCallback(async (): Promise<void> => {
    await writeCredential(null);
    tokenRef.current = null;
    setState({ status: 'signed-out' });
  }, []);
  const api = useCallback(
    async <T,>(path: string, decode: Decoder<T>, options?: RequestOptions): Promise<T> => {
      const token = tokenRef.current;
      if (!token) throw new ApiError('Sign in to continue.', 401, 'UNAUTHENTICATED', false);
      try {
        return await requestJson(path, token, decode, options);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await expire(token);
        throw error;
      }
    },
    [expire],
  );
  const pdf = useCallback(
    async (path: string): Promise<ArrayBuffer> => {
      const token = tokenRef.current;
      if (!token) throw new ApiError('Sign in to continue.', 401, 'UNAUTHENTICATED', false);
      try {
        const response = await request(path, token);
        if (!response.headers.get('content-type')?.includes('application/pdf'))
          throw new Error('The report response was not a PDF. Please retry.');
        return await response.arrayBuffer();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await expire(token);
        throw error;
      }
    },
    [expire],
  );
  return (
    <AuthContext.Provider value={{ state, signIn, signOut, restore, api, pdf }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Authentication provider is missing.');
  return value;
}
