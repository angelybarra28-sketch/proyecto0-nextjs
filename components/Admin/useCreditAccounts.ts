'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchCreditAccounts,
  createCreditAccount,
  fetchCreditAccountDetail,
  registerCreditPayment,
  addCreditCollectionNote,
  fetchCreditCollectionRoute,
} from '@/lib/services/admin/client';
import type {
  CreditAccountSummary,
  CreditAccountDetail,
  CreditDashboard,
  CollectionRouteItem,
  CreateCreditAccountInput,
} from '@/lib/types';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useCreditAccounts(enabled: boolean) {
  const [accounts, setAccounts] = useState<CreditAccountSummary[]>([]);
  const [dashboard, setDashboard] = useState<CreditDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchCreditAccounts(signal);
      setAccounts(data.accounts);
      setDashboard(data.dashboard);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      console.error('Error loading credit accounts:', err);
      setError('No se pudieron cargar las cuentas corrientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  const createAccount = useCallback(async (input: CreateCreditAccountInput) => {
    try {
      const account = await createCreditAccount(input);
      setAccounts((prev) => [account, ...prev]);
      await load();
      return account;
    } catch (err) {
      console.error('Error creating credit account:', err);
      throw err;
    }
  }, [load]);

  return { accounts, dashboard, isLoading, error, reload: load, createAccount };
}

export function useCreditAccountDetail(accountId: string | null) {
  const [account, setAccount] = useState<CreditAccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchCreditAccountDetail(id, signal);
      setAccount(data);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      console.error('Error loading credit account detail:', err);
      setError('No se pudo cargar el detalle de la cuenta corriente');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accountId) {
      setAccount(null);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    load(accountId, controller.signal);
    return () => controller.abort();
  }, [accountId, load]);

  const addPayment = useCallback(async (amount: number, notes?: string) => {
    if (!accountId) return;
    try {
      const updated = await registerCreditPayment(accountId, { amount, notes });
      setAccount(updated);
    } catch (err) {
      console.error('Error registering payment:', err);
      throw err;
    }
  }, [accountId]);

  const addNote = useCallback(async (
    input: Omit<Parameters<typeof addCreditCollectionNote>[1], 'createdBy'> & { createdBy: string }
  ) => {
    if (!accountId) return;
    try {
      const note = await addCreditCollectionNote(accountId, input);
      setAccount((prev) => {
        if (!prev) return prev;
        return { ...prev, collectionNotes: [note, ...prev.collectionNotes] };
      });
    } catch (err) {
      console.error('Error adding collection note:', err);
      throw err;
    }
  }, [accountId]);

  return { account, isLoading, error, reload: load, addPayment, addNote };
}

export function useCollectionRoute(enabled: boolean) {
  const [route, setRoute] = useState<CollectionRouteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchCreditCollectionRoute(signal);
      setRoute(data);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      console.error('Error loading collection route:', err);
      setError('No se pudo cargar la ruta de cobranza');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  return { route, isLoading, error, reload: load };
}
