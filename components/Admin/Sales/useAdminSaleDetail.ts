import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAdminSaleDetail, fetchAdminProducts, registerAdminSalePayment, updateAdminSale } from '@/lib/services/admin/client';
import type { AdminSaleDetail, PaymentMethod, SaleStatus, SaleItemInsert } from '@/lib/supabase/types';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

type EditItem = {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  category: string | null;
  categoryName: string;
  slug: string;
  legacyProductId: number | null;
  installmentCount: number;
};

type UseAdminSaleDetailParams = {
  isAdmin: boolean;
  saleId: string;
};

export function useAdminSaleDetail({ isAdmin, saleId }: UseAdminSaleDetailParams) {
  const [sale, setSale] = useState<AdminSaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);

  const [editSaleNumber, setEditSaleNumber] = useState('');
  const [editDelivery, setEditDelivery] = useState({ fullName: '', phone: '', address: '', city: '', notes: '' });

  const [editStatus, setEditStatus] = useState<SaleStatus>('PENDING');

  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editDiscount, setEditDiscount] = useState('0');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<AdminCatalogProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    const controller = new AbortController();

    fetchAdminSaleDetail(saleId, controller.signal)
      .then((data) => {
        if (!isMounted) return;
        setSale(data);
        setEditSaleNumber(data.saleNumber);
        setEditDelivery({
          fullName: data.deliveryFullName ?? '',
          phone: data.deliveryPhone ?? '',
          address: data.deliveryAddress ?? '',
          city: data.deliveryCity ?? '',
          notes: data.notes ?? '',
        });
        setEditStatus(data.saleStatus);
        setEditDiscount(String(data.discountAmount));
        setEditItems(
          data.items.map((item, index) => ({
            key: `${item.id ?? index}`,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            category: item.category,
            categoryName: item.category ?? '',
            slug: item.slug ?? '',
            legacyProductId: item.legacyProductId,
            installmentCount: 8,
          }))
        );
      })
      .catch((loadError: unknown) => {
        if (isAbortError(loadError) || !isMounted) return;
        console.error('Error loading sale detail:', loadError);
        setError('No se pudo cargar el detalle de la venta');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isAdmin, saleId]);

  const refreshSale = useCallback(async () => {
    try {
      const updated = await fetchAdminSaleDetail(saleId);
      setSale(updated);
    } catch {
      console.error('Error refreshing sale');
    }
  }, [saleId]);

  const handleSaveAll = async () => {
    if (!sale || isSaving) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const items: SaleItemInsert[] = editItems.map((item) => ({
        sale_id: sale.id,
        product_name_snapshot: item.name,
        product_slug_snapshot: item.slug || null,
        category_name_snapshot: item.categoryName || null,
        legacy_product_id: item.legacyProductId,
        unit_price_snapshot: item.unitPrice,
        quantity: item.quantity,
        line_subtotal: item.unitPrice * item.quantity,
        line_discount_amount: 0,
        line_total: item.unitPrice * item.quantity,
      }));

      const newSubtotal = items.reduce((sum, item) => sum + item.line_total, 0);
      const discount = Number(editDiscount) || 0;
      const newTotal = newSubtotal - discount;
      const firstInstallmentCount = editItems[0]?.installmentCount ?? 8;

      const wasPending = sale.saleStatus === 'PENDING';
      const result = await updateAdminSale(sale.id, {
        sale_number: editSaleNumber,
        sale_status: editStatus,
        delivery_full_name: editDelivery.fullName,
        delivery_phone: editDelivery.phone,
        delivery_address: editDelivery.address,
        delivery_city: editDelivery.city,
        notes: editDelivery.notes,
        subtotal_amount: newSubtotal,
        discount_amount: discount,
        total_amount: newTotal,
        remaining_amount: newTotal - sale.paidAmount,
        item_count: items.length,
        installments_count: firstInstallmentCount,
        items,
      });
      await refreshSale();

      if (wasPending && editStatus === 'CONFIRMED' && result.creditAccountId) {
        setSaveMessage('Venta confirmada y cuenta corriente creada');
      } else {
        setSaveMessage('Guardado');
      }
    } catch {
      setSaveMessage('Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemNameChange = (key: string, name: string) => {
    setEditItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, name } : item))
    );
  };

  const handleItemPriceChange = (key: string, price: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, unitPrice: price } : item))
    );
  };

  const handleItemQuantityChange = (key: string, quantity: number) => {
    setEditItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const handleItemInstallmentCountChange = (key: string, count: number) => {
    setEditItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, installmentCount: Math.max(1, count) } : item
      )
    );
  };

  const handleItemInstallmentAmountChange = (key: string, amount: number) => {
    if (amount <= 0) return;
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const lineTotal = item.unitPrice * item.quantity;
        const newCount = Math.max(1, Math.round(lineTotal / amount));
        return { ...item, installmentCount: newCount };
      })
    );
  };

  const handleRemoveItem = (key: string) => {
    setEditItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSearchProducts = useCallback((query: string) => {
    setProductSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query.trim()) {
      setProductSearchResults([]);
      setShowProductSearch(false);
      return;
    }

    setIsSearchingProducts(true);
    setShowProductSearch(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const result = await fetchAdminProducts({ search: query, limit: 6, status: 'ACTIVE' });
        setProductSearchResults(result.products ?? []);
      } catch {
        setProductSearchResults([]);
      } finally {
        setIsSearchingProducts(false);
      }
    }, 300);
  }, []);

  const handleAddProduct = useCallback((product: AdminCatalogProduct) => {
    const newKey = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEditItems((prev) => [
      ...prev,
      {
        key: newKey,
        name: product.name,
        unitPrice: product.price,
        quantity: 1,
        category: product.categoryName,
        categoryName: product.categoryName,
        slug: product.slug,
        legacyProductId: product.legacyProductId,
        installmentCount: product.installmentCount ?? 8,
      },
    ]);
    setProductSearchQuery('');
    setProductSearchResults([]);
    setShowProductSearch(false);
  }, []);

  const registerPayment = async () => {
    if (!sale || isRegisteringPayment) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Ingresá un monto válido');
      return;
    }

    const cappedAmount = Math.min(amount, sale.remainingAmount);

    const parsedPaymentDate = new Date(paymentDate);
    const maxPaymentDate = new Date();
    maxPaymentDate.setDate(maxPaymentDate.getDate() + 7);

    if (!paymentDate || Number.isNaN(parsedPaymentDate.getTime()) || parsedPaymentDate > maxPaymentDate) {
      setPaymentError('Ingresá una fecha de pago válida');
      return;
    }

    setIsRegisteringPayment(true);
    setPaymentError('');
    const requestId = paymentRequestId ?? crypto.randomUUID();
    setPaymentRequestId(requestId);

    try {
      await registerAdminSalePayment({
        saleId: sale.id,
        paymentRequestId: requestId,
        amount: cappedAmount,
        paymentMethod,
        paymentDate,
        notes: paymentNotes || undefined,
      });

      const updatedSale = await fetchAdminSaleDetail(sale.id);
      setSale(updatedSale);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentRequestId(null);
    } catch (paymentLoadError: unknown) {
      console.error('Error registering payment:', paymentLoadError);
      setPaymentError(paymentLoadError instanceof Error ? paymentLoadError.message : 'No se pudo registrar el pago');
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  return {
    sale,
    isLoading,
    error,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDate,
    setPaymentDate,
    paymentNotes,
    setPaymentNotes,
    paymentError,
    isRegisteringPayment,
    registerPayment,
    editSaleNumber,
    setEditSaleNumber,
    editDelivery,
    setEditDelivery,
    editStatus,
    setEditStatus,
    editItems,
    editDiscount,
    setEditDiscount,
    isSaving,
    saveMessage,
    handleSaveAll,
    handleItemNameChange,
    handleItemPriceChange,
    handleItemQuantityChange,
    handleItemInstallmentCountChange,
    handleItemInstallmentAmountChange,
    handleRemoveItem,
    productSearchQuery,
    productSearchResults,
    isSearchingProducts,
    showProductSearch,
    setShowProductSearch,
    handleSearchProducts,
    handleAddProduct,
  };
}
