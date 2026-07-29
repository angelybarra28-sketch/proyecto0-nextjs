'use client';

import { useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';

export const CUOTA_OPTIONS = [4, 8, 9, 10, 12];

function calculateValorCuota(precio: number, cuotas: number): string {
  if (cuotas > 0 && precio > 0) {
    return (precio / cuotas).toString();
  }
  return '';
}

type UseProductPricingInput = {
  mode: 'create' | 'edit';
  product?: AdminCatalogProduct;
};

export function useProductPricing({ mode, product }: UseProductPricingInput) {
  const cuotaInicial = mode === 'edit' ? (product!.installmentCount?.toString() ?? '8') : '8';

  const [price, setPrice] = useState(mode === 'edit' ? product!.price.toString() : '');
  const [referencePrice, setReferencePrice] = useState(
    mode === 'edit' ? (product!.referencePrice?.toString() ?? '') : ''
  );
  const [installmentCount, setInstallmentCount] = useState(cuotaInicial);
  const [installmentAmount, setInstallmentAmount] = useState(
    mode === 'edit'
      ? (product!.installmentAmount?.toString() ?? calculateValorCuota(product!.price, parseInt(cuotaInicial, 10)))
      : ''
  );

  const recalculateValorCuota = (precio: string, cuotas: string) => {
    const p = parseFloat(precio);
    const c = parseInt(cuotas, 10);
    setInstallmentAmount(calculateValorCuota(p, c));
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    recalculateValorCuota(value, installmentCount);
  };

  const handleInstallmentCountChange = (value: string) => {
    setInstallmentCount(value);
    recalculateValorCuota(price, value);
  };

  const handleInstallmentAmountChange = (value: string) => {
    setInstallmentAmount(value);
    const c = parseInt(installmentCount, 10);
    const cuota = parseFloat(value);
    if (c > 0 && cuota > 0) {
      setPrice((c * cuota).toString());
    }
  };

  const handleReferencePriceChange = (value: string) => {
    setReferencePrice(value);
    if (mode === 'create') {
      const ref = parseFloat(value);
      if (ref > 0) {
        const nuevoPrecio = (ref * 3).toString();
        setPrice(nuevoPrecio);
        recalculateValorCuota(nuevoPrecio, installmentCount);
      }
    }
  };

  return {
    price,
    setPrice,
    referencePrice,
    setReferencePrice,
    installmentCount,
    setInstallmentCount,
    installmentAmount,
    setInstallmentAmount,
    handlePriceChange,
    handleReferencePriceChange,
    handleInstallmentCountChange,
    handleInstallmentAmountChange,
  };
}
