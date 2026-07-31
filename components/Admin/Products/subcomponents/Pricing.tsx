'use client';

import { CUOTA_OPTIONS } from '../hooks/useProductPricing';

type PricingProps = {
  price: string;
  referencePrice: string;
  installmentCount: string;
  installmentAmount: string;
  priceChangeReason: string;
  disabled: boolean;
  isCreate: boolean;
  onPriceChange: (value: string) => void;
  onReferencePriceChange: (value: string) => void;
  onInstallmentCountChange: (value: string) => void;
  onInstallmentAmountChange: (value: string) => void;
  onPriceChangeReasonChange: (value: string) => void;
};

export function Pricing({
  price,
  referencePrice,
  installmentCount,
  installmentAmount,
  priceChangeReason,
  disabled,
  isCreate,
  onPriceChange,
  onReferencePriceChange,
  onInstallmentCountChange,
  onInstallmentAmountChange,
  onPriceChangeReasonChange,
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
      {!isCreate && (
        <tr>
          <td>Motivo del cambio</td>
          <td>
            <input
              type="text"
              value={priceChangeReason}
              disabled={disabled}
              onChange={(e) => onPriceChangeReasonChange(e.target.value)}
              placeholder="Aumento proveedor, Promoción, Actualización de lista, Corrección..."
            />
            <small style={{ display: 'block', color: '#888', marginTop: '0.25rem' }}>
              Opcional. Se guardará en el historial de precios cuando cambies el precio de venta.
            </small>
          </td>
        </tr>
      )}
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
