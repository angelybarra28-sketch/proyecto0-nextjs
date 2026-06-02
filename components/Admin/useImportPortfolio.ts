'use client';

import { useCallback, useState } from 'react';
import { previewPortfolioImport, executePortfolioImport } from '@/lib/services/admin/client';
import type { ImportPortfolioPreview, ImportPortfolioResult, ImportPortfolioRow } from '@/lib/types';

export function useImportPortfolio() {
  const [preview, setPreview] = useState<ImportPortfolioPreview | null>(null);
  const [result, setResult] = useState<ImportPortfolioResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const uploadForPreview = useCallback(async (file: File) => {
    setIsUploading(true);
    setError('');
    setPreview(null);
    setResult(null);
    setConfirmed(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await previewPortfolioImport(formData);
      setPreview(data);
    } catch (err) {
      console.error('Error previewing import:', err);
      setError(err instanceof Error ? err.message : 'Error al generar el preview');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const confirmImport = useCallback(async (rows: ImportPortfolioRow[]) => {
    if (!confirmed) return;
    setIsImporting(true);
    setError('');
    try {
      const data = await executePortfolioImport(rows);
      setResult(data);
      setPreview(null);
    } catch (err) {
      console.error('Error importing portfolio:', err);
      setError(err instanceof Error ? err.message : 'Error al importar la cartera');
    } finally {
      setIsImporting(false);
    }
  }, [confirmed]);

  return {
    preview,
    result,
    isUploading,
    isImporting,
    error,
    confirmed,
    setConfirmed,
    uploadForPreview,
    confirmImport,
  };
}
