import * as xlsx from 'xlsx';

const MONTH_NAMES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

export interface ExportableAccount {
  customerName?: string;
  operationNumber?: string | null;
  productName: string;
  saleDate: string;
  total: number;
  paid: number;
  remaining: number;
  originMonth?: number | null;
  originYear?: number | null;
}

export function exportCreditAccountsToExcel(accounts: ExportableAccount[], fileName?: string) {
  const data = accounts.map((acc) => ({
    Cliente: acc.customerName ?? 'Sin nombre',
    Tarjeta: acc.operationNumber ?? '-',
    Producto: acc.productName,
    'Fecha de Venta': new Date(acc.saleDate).toLocaleDateString('es-AR'),
    'Mes Origen': acc.originMonth ? MONTH_NAMES[acc.originMonth - 1] : '-',
    'Año Origen': acc.originYear ?? '-',
    'Total Financiado': acc.total,
    Pagado: acc.paid,
    Restante: acc.remaining,
    Estado: acc.remaining <= 0 ? 'Finalizada' : acc.paid === 0 ? 'Pendiente' : 'En curso',
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Cuentas Corrientes');
  const defaultName = `Cuentas_Corrientes_${new Date().toISOString().split('T')[0]}.xlsx`;
  xlsx.writeFile(workbook, fileName ?? defaultName);
}

export interface ControlMensualRow {
  customerName: string;
  operationNumber: string;
  productName: string;
  installmentAmount: number;
  status: string;
  saleDate: string;
  lastPaymentDate: string | null;
  remainingAmount: number;
  originMonth?: number | null;
  originYear?: number | null;
}

export interface ControlMensualSummary {
  monthlyReplacement: number;
  finishedCards: number;
  currentMonthlyCollection: number;
  projectedNextMonth: number;
}

export function exportControlMensualToExcel(
  rows: ControlMensualRow[],
  summary: ControlMensualSummary
) {
  const data: Record<string, unknown>[] = rows.map((r) => ({
    Cliente: r.customerName,
    Tarjeta: r.operationNumber || '-',
    Producto: r.productName,
    Cuota: r.installmentAmount,
    Estado: r.status,
    'Fecha de Venta': r.saleDate ? new Date(r.saleDate).toLocaleDateString('es-AR') : '-',
    'Fecha Último Pago': r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString('es-AR') : '-',
    'Saldo Pendiente': r.remainingAmount,
    'Mes Origen': r.originMonth ? MONTH_NAMES[r.originMonth - 1] : '-',
    'Año Origen': r.originYear ?? '-',
  }));

  // Add summary rows
  data.push({});
  data.push({ Cliente: 'RESUMEN' });
  data.push({ Cliente: 'Reposición del mes', Tarjeta: summary.monthlyReplacement });
  data.push({ Cliente: 'Tarjetas terminadas', Tarjeta: summary.finishedCards });
  data.push({ Cliente: 'Cobranza Actual', Tarjeta: summary.currentMonthlyCollection });
  data.push({ Cliente: 'Proyección próxima cobranza', Tarjeta: summary.projectedNextMonth });

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Control Mensual');
  const fileName = `Control_Mensual_${new Date().toISOString().split('T')[0]}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
