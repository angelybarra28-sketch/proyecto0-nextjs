'use client';

type StockProps = {
  stock: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

export function Stock({ stock, disabled, onChange }: StockProps) {
  return (
    <tr>
      <td>Stock</td>
      <td>
        <input
          type="number"
          min="0"
          step="1"
          value={stock}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      </td>
    </tr>
  );
}
