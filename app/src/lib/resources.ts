import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './auth';
import { messageOf, query } from './api';
import { decodePage, type Decoder, type Page } from './contract';

export interface Resource<T> {
  data: T | null;
  pending: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function useResource<T>(path: string, decode: Decoder<T>): Resource<T> {
  const { api } = useAuth();
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    pending: boolean;
    error: string | null;
  }>({ key: path, data: null, pending: true, error: null });
  const generation = useRef(0);
  const refresh = useCallback(async (): Promise<void> => {
    const run = ++generation.current;
    setState((previous) => ({
      key: path,
      data: previous.key === path ? previous.data : null,
      pending: true,
      error: null,
    }));
    try {
      const data = await api(path, decode);
      if (run === generation.current) setState({ key: path, data, pending: false, error: null });
    } catch (error) {
      if (run === generation.current)
        setState((previous) => ({ ...previous, pending: false, error: messageOf(error) }));
    }
  }, [path, decode, api]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        generation.current += 1;
      };
    }, [refresh]),
  );
  return {
    data: state.key === path ? state.data : null,
    pending: state.key !== path || state.pending,
    error: state.key === path ? state.error : null,
    refresh,
  };
}
export interface Collection<T> {
  items: T[];
  pending: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  more: () => Promise<void>;
}
export function useCollection<T>(
  path: string,
  decode: Decoder<T>,
  params: Record<string, string | undefined> = {},
): Collection<T> {
  const { api } = useAuth();
  const base = query(path, params);
  const [state, setState] = useState<{
    key: string;
    page: Page<T>;
    pending: boolean;
    error: string | null;
  }>({ key: base, page: { items: [], nextCursor: null }, pending: true, error: null });
  const generation = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(async (): Promise<void> => {
    const run = ++generation.current;
    busy.current = true;
    setState((previous) => ({
      key: base,
      page: previous.key === base ? previous.page : { items: [], nextCursor: null },
      pending: true,
      error: null,
    }));
    try {
      const page = await api(base, decodePage(decode));
      if (run === generation.current) setState({ key: base, page, pending: false, error: null });
    } catch (error) {
      if (run === generation.current)
        setState((previous) => ({ ...previous, pending: false, error: messageOf(error) }));
    } finally {
      if (run === generation.current) busy.current = false;
    }
  }, [api, base, decode]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        generation.current += 1;
        busy.current = false;
      };
    }, [refresh]),
  );
  const more = useCallback(async (): Promise<void> => {
    const cursor = state.page.nextCursor;
    if (!cursor || busy.current) return;
    const run = generation.current;
    busy.current = true;
    setState((previous) => ({ ...previous, pending: true, error: null }));
    try {
      const page = await api(
        `${base}${base.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}`,
        decodePage(decode),
      );
      if (run === generation.current)
        setState((previous) => ({
          key: base,
          page: { items: [...previous.page.items, ...page.items], nextCursor: page.nextCursor },
          pending: false,
          error: null,
        }));
    } catch (error) {
      if (run === generation.current)
        setState((previous) => ({ ...previous, pending: false, error: messageOf(error) }));
    } finally {
      if (run === generation.current) busy.current = false;
    }
  }, [api, base, decode, state.page.nextCursor]);
  return {
    items: state.key === base ? state.page.items : [],
    pending: state.key !== base || state.pending,
    error: state.key === base ? state.error : null,
    hasMore: state.key === base && state.page.nextCursor !== null,
    refresh,
    more,
  };
}
