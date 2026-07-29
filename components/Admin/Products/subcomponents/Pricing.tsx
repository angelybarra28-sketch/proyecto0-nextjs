'use client';

import { CUOTA_OPTIONS } from '../hooks/useProductPricing';

type PricingProps = {
  price: string;
  referencePrice: string;
  installmentCount: string;
  installmentAmount: string;
  disabled: boolean;
  isCreate: boolean;
  onPriceChange: (value: string) => void;
  onReferencePriceChange: (value: string) => void;
  onInstallmentCountChange: (value: string) => void;
  onInstallmentAmountChange: (value: string) => void;
};

export function Pricing({
  price,
  referencePrice,
  installmentCount,
  installmentAmount,
  disabled,
  isCreate,
  onPriceChange,
  onReferencePriceChange,
  onInstallmentCountChange,
  onInstallmentAmountChange,
}: PricingProps) {
  return (
    <>
      <tr>
        <td>Precio de referencia</td>
        <td>
          <input
            type="number"
            min="0"
            step="0.01"
            value={referencePrice}
            disabled={disabled}
            onChange={(e) => onReferencePriceChange(e.target.value)}
            placeholder="Precio del proveedor"
          />
          <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
            Precio original del proveedor. Solo visible en el admin.
          </small>
        </td>
      </tr>
      <tr>
        <td>Precio de venta</td>
        <td>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            disabled={disabled}
            onChange={(e) => onPriceChange(e.target.value)}
            required
          />
          {isCreate && (
            <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
              Precio sugerido: ref × 3. Podés modificarlo manualmente.
            </small>
          )}
        </td>
      </tr>
      <tr>
        <td>Cuotas</td>
        <td>
          <select
            value={installmentCount}
            disabled={disabled}
            onChange={(e) => onInstallmentCountChange(e.target.value)}
            required
            style={{ width: '80px', marginRight: '0.5rem' }}
          >
            {CUOTA_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span style={{ color: '#888' }}>cuotas de $</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={installmentAmount}
            disabled={disabled}
            onChange={(e) => onInstallmentAmountChange(e.target.value)}
            style={{ width: '120px', marginLeft: '0.5rem' }}
          />
          <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
            Precio = cuotas × valor cuota. Podés editar cualquiera de los dos.
          </small>
        </td>
      </tr>
    </>
  );
}
