import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getSaleById } from '@/lib/repositories/saleRepository';
import {
  insertCreditAccount,
  insertCreditAccountItems,
  findCreditAccountByOperationNumber,
} from '@/lib/repositories/creditAccountRepository';
import type { PaymentMethod } from '@/lib/supabase/types';

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'EFECTIVO',
  BANK_TRANSFER: 'TRANSFERENCIA',
  MERCADO_PAGO: 'MERCADO_PAGO',
  CREDIT_CARD: 'OTRO',
  DEBIT_CARD: 'OTRO',
  OTHER: 'OTRO',
};

const INSTALLMENT_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
};

function toMonthNumber(dateStr: string): number {
  return new Date(dateStr).getMonth() + 1;
}

function toYear(dateStr: string): number {
  return new Date(dateStr).getFullYear();
}

export async function createCreditAccountFromSale(saleId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error('[saleToCredit] Supabase client not available');
    return null;
  }

  const sale = await getSaleById(supabase, saleId);
  if (!sale) {
    console.error(`[saleToCredit] Sale ${saleId} not found`);
    return null;
  }

  if (sale.saleStatus !== 'CONFIRMED') {
    console.error(`[saleToCredit] Sale ${saleId} status is ${sale.saleStatus}, expected CONFIRMED`);
    return null;
  }

  const existing = await findCreditAccountByOperationNumber(supabase, sale.saleNumber);
  if (existing) {
    console.log(`[saleToCredit] Credit account already exists for sale ${sale.saleNumber} (account ${existing.id})`);
    return existing.id;
  }

  const saleDate = sale.createdAt;
  const productName = sale.items.length > 0
    ? sale.items.map((item) => `${item.name} (x${item.quantity})`).join(' + ')
    : 'Venta sin productos';

  const quantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const installmentCount = sale.installmentsCount || sale.installments.length || 1;
  const installmentAmount = sale.installments.length > 0
    ? sale.installments[0].originalAmount
    : sale.total / installmentCount;

  const account = await insertCreditAccount(supabase, {
    customer_id: sale.customer?.id ?? '',
    operation_number: sale.saleNumber,
    product_name: productName,
    quantity,
    installment_count: installmentCount,
    installment_amount: installmentAmount,
    sale_date: saleDate,
    notes: `Convertido desde venta ${sale.saleNumber}${sale.notes ? ' — ' + sale.notes : ''}`,
    origin_month: toMonthNumber(saleDate),
    origin_year: toYear(saleDate),
  });

  if (sale.items.length > 0) {
    await insertCreditAccountItems(
      supabase,
      account.id,
      sale.items.map((item) => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    );
  }

  if (sale.installments.length > 0) {
    const installmentRows = sale.installments.map((inst) => ({
      credit_account_id: account.id,
      installment_number: inst.installmentNumber,
      due_date: inst.dueDate,
      original_amount: inst.originalAmount,
      paid_amount: inst.paidAmount,
      remaining_amount: inst.remainingAmount,
      status: INSTALLMENT_STATUS_MAP[inst.status] ?? 'PENDING',
    }));

    const { error: instError } = await supabase
      .from('credit_installments')
      .insert(installmentRows);

    if (instError) {
      console.error('[saleToCredit] Error inserting credit_installments:', instError);
    }

    if (sale.payments.length > 0) {
      const paymentIdMap = new Map<string, string>();

      for (const payment of sale.payments) {
        const mappedMethod = PAYMENT_METHOD_MAP[payment.paymentMethod] ?? 'OTRO';

        const { data: creditPayment, error: payError } = await supabase
          .from('credit_payments')
          .insert({
            credit_account_id: account.id,
            amount: payment.amount,
            payment_date: payment.paymentDate,
            payment_method: mappedMethod,
            notes: payment.notes,
          })
          .select('id')
          .single();

        if (payError) {
          console.error('[saleToCredit] Error inserting credit_payment:', payError);
          continue;
        }

        paymentIdMap.set(payment.id, creditPayment.id);

        const activeAllocations = payment.allocations.filter((a) => a.status === 'ACTIVE');
        if (activeAllocations.length > 0) {
          const allocationRows = activeAllocations.map((alloc, idx) => ({
            credit_payment_id: creditPayment.id,
            credit_installment_id: account.id,
            amount: alloc.amount,
          }));

          const instIdMap = new Map<string, string>();
          for (const inst of sale.installments) {
            const { data: creditInst } = await supabase
              .from('credit_installments')
              .select('id')
              .eq('credit_account_id', account.id)
              .eq('installment_number', inst.installmentNumber)
              .maybeSingle();

            if (creditInst) {
              instIdMap.set(inst.id, creditInst.id);
            }
          }

          const mappedAllocationRows = activeAllocations.map((alloc) => ({
            credit_payment_id: creditPayment.id,
            credit_installment_id: instIdMap.get(alloc.installmentId) ?? '',
            amount: alloc.amount,
          })).filter((row) => row.credit_installment_id !== '');

          if (mappedAllocationRows.length > 0) {
            const { error: allocError } = await supabase
              .from('credit_payment_allocations')
              .insert(mappedAllocationRows);

            if (allocError) {
              console.error('[saleToCredit] Error inserting credit_payment_allocations:', allocError);
            }
          }
        }
      }
    }
  }

  console.log(`[saleToCredit] Credit account ${account.id} created from sale ${sale.saleNumber}`);
  return account.id;
}
