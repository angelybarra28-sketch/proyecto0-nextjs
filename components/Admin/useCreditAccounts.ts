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

export function useCreditAccounts(
  enabled: boolean,
  search?: string,
  statusFilter: 'active' | 'finished' | 'all' = 'active'
) {
  const [accounts, setAccounts] = useState<CreditAccountSummary[]>([]);
  const [dashboard, setDashboard] = useState<CreditDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchCreditAccounts(signal, {
        search,
        statusFilter,
      });

      setAccounts(data.accounts);
      setDashboard(data.dashboard);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      console.error('Error loading credit accounts:', err);
      setError('No se pudieron cargar las cuentas corrientes');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchCreditAccounts(undefined, {
        search,
        statusFilter,
      });
      setAccounts(data.accounts);
      setDashboard(data.dashboard);
    } catch (err) {
      console.error('Error reloading credit accounts:', err);
      setError('No se pudieron cargar las cuentas corrientes');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

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

  const addPaymentInline = useCallback(async (accountId: string, amount: number, paymentMethod: string, paymentDate: string) => {
    await registerCreditPayment(accountId, { amount, paymentMethod, paymentDate });
    await load();
  }, [load]);

  const fixInstallments = useCallback(async (accountId: string) => {
    const res = await fetch(`/api/admin/credit-accounts/${accountId}/fix-installments`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al corregir cuotas' }));
      throw new Error(err.message ?? 'Error al corregir cuotas');
    }
    await load();
  }, [load]);

  return { accounts, dashboard, isLoading, error, reload, createAccount, addPaymentInline, fixInstallments };
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

  const addPayment = useCallback(async (amount: number, paymentMethod?: string, notes?: string) => {
    if (!accountId) return;
    try {
      const updated = await registerCreditPayment(accountId, { amount, paymentMethod, notes });
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
