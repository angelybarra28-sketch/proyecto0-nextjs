import * as xlsx from 'xlsx';

export interface ExportableAccount {
  customerName?: string;
  operationNumber?: string | null;
  productName: string;
  saleDate: string;
  total: number;
  paid: number;
  remaining: number;
}

export function exportCreditAccountsToExcel(accounts: ExportableAccount[]) {
  const data = accounts.map((acc) => ({
    Cliente: acc.customerName ?? 'Sin nombre',
    Tarjeta: acc.operationNumber ?? '-',
    Producto: acc.productName,
    'Fecha de Venta': new Date(acc.saleDate).toLocaleDateString('es-AR'),
    'Total Financiado': acc.total,
    Pagado: acc.paid,
    Restante: acc.remaining,
    Estado: acc.remaining <= 0 ? 'Finalizada' : acc.paid === 0 ? 'Pendiente' : 'En curso',
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Cuentas Corrientes');
  const fileName = `Cuentas_Corrientes_${new Date().toISOString().split('T')[0]}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
