'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useAdminAccess } from '@/components/Admin/useAdminData';

// =============================================================================
// TYPES
// =============================================================================
interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
}

interface FormItem {
  productName: string;
  quantity: number;
}

interface FormData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: FormItem[];
  saleDate: string;
  notes: string;
  installmentAmount: number;
  installmentCount: number;
  operationNumber: string;
}

// =============================================================================
// COMPONENT: Nueva Venta Manual (Credit Account)
// Estilo homogeneizado con la interfaz principal del sitio (ElectroBlancos)
// =============================================================================
export default function NuevaVentaPage() {
  const { isAdmin } = useAdminAccess();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState<FormData>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ productName: '', quantity: 1 }],
    saleDate: new Date().toISOString().split('T')[0],
    notes: '',
    installmentAmount: 0,
    installmentCount: 8,
    operationNumber: '',
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const customerSearchRef = useRef<HTMLDivElement>(null);
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Computed: Total Financiado
  // ---------------------------------------------------------------------------
  const totalFinanciado = form.installmentAmount * form.installmentCount;

  // ---------------------------------------------------------------------------
  // Handlers: Form changes
  // ---------------------------------------------------------------------------
  const handleChange = useCallback(
    (field: keyof FormData, value: string | number) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Customer Search (debounced)
  // ---------------------------------------------------------------------------
  const searchCustomers = useCallback(
    async (query: string) => {
      if (!supabase || query.trim().length < 2) {
        setCustomers([]);
        setShowCustomerDropdown(false);
        return;
      }

      setIsSearchingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name, phone, address')
          .or(`full_name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`)
          .limit(10);

        if (error) throw error;

        setCustomers(data || []);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error('Error searching customers:', err);
        setCustomers([]);
      } finally {
        setIsSearchingCustomers(false);
      }
    },
    [supabase]
  );

  const handleCustomerSearchChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, customerName: value, customerId: '' }));

      if (customerSearchTimeout.current) {
        clearTimeout(customerSearchTimeout.current);
      }

      customerSearchTimeout.current = setTimeout(() => {
        searchCustomers(value);
      }, 300);
    },
    [searchCustomers]
  );

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.full_name,
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
    }));
    setShowCustomerDropdown(false);
    setCustomers([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Create Customer (if not found)
  // ---------------------------------------------------------------------------
  const createCustomer = useCallback(async (): Promise<string> => {
    if (form.customerId) {
      return form.customerId;
    }

    if (!form.customerName.trim()) {
      throw new Error('El nombre del cliente es requerido');
    }

    const response = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.customerName.trim(),
        phone: form.customerPhone.trim() || undefined,
        address: form.customerAddress.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.error('[createCustomer] API error:', payload);
      throw new Error(payload.message || 'No se pudo crear el cliente');
    }

    const payload = (await response.json()) as {
      success: boolean;
      customerId: string;
      existing?: boolean;
    };

    if (!payload.success) {
      throw new Error('La respuesta del servidor indica error al crear el cliente');
    }

    return payload.customerId;
  }, [form.customerId, form.customerName, form.customerPhone, form.customerAddress]);

  // ---------------------------------------------------------------------------
  // Submit: Create Credit Account
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      setSubmitSuccess(false);
      setIsSubmitting(true);

      try {
        const validItems = form.items.filter((item) => item.productName.trim());
        if (validItems.length === 0) {
          throw new Error('Debe ingresar al menos un producto');
        }
        if (form.installmentAmount <= 0) {
          throw new Error('El monto de la cuota debe ser mayor a 0');
        }
        if (form.installmentCount <= 0) {
          throw new Error('La cantidad de cuotas debe ser mayor a 0');
        }
        for (const item of validItems) {
          if (item.quantity <= 0) {
            throw new Error('La cantidad de cada producto debe ser mayor a 0');
          }
        }

        const customerId = await createCustomer();

        const response = await fetch('/api/admin/credit-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            operationNumber: form.operationNumber.trim() || undefined,
            items: validItems.map((item) => ({
              productName: item.productName.trim(),
              quantity: item.quantity,
            })),
            installmentCount: form.installmentCount,
            installmentAmount: form.installmentAmount,
            saleDate: form.saleDate,
            notes: form.notes.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Error al crear la cuenta corriente');
        }

        const payload = await response.json() as { success: boolean; account: { id: string } };

        if (!payload.success) {
          throw new Error('La respuesta del servidor indica error');
        }

        setSubmitSuccess(true);
        setIsSubmitting(false);

        setTimeout(() => {
          router.push('/admin/cuenta-corriente');
        }, 1500);
      } catch (err) {
        console.error('Error creating credit account:', err);
        setSubmitError(
          err instanceof Error ? err.message : 'Error inesperado al crear la venta'
        );
        setIsSubmitting(false);
      }
    },
    [form, createCustomer, router]
  );

  // ---------------------------------------------------------------------------
  // Click outside to close dropdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Guard: Admin only
  // ---------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e1d1b',
        }}
      >
        <p style={{ color: '#d3cdc4' }}>Acceso restringido. Redirigiendo...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1e1d1b', fontFamily: 'var(--font-geist-sans), Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: '#262422',
          borderBottom: '1px solid #363330',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f5f2ec' }}>
              Nueva Venta a Crédito
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#d3cdc4' }}>
              Carga manual de cuenta corriente
            </p>
          </div>
          <Link
            href="/admin/cuentas-corrientes"
            style={{ fontSize: '0.85rem', color: '#b8a89c', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = '#e8e4df';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = '#b8a89c';
            }}
          >
            ← Volver al listado
          </Link>
        </div>
      </header>

      {/* Main Form */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Success Banner */}
        {submitSuccess && (
          <div
            style={{
              marginBottom: '24px',
              borderRadius: '8px',
              border: '1px solid #5a5248',
              backgroundColor: '#262422',
              padding: '16px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '12px', flexShrink: 0 }}>
                <circle cx="10" cy="10" r="10" fill="#5a5248" />
                <path d="M6 10l3 3 5-6" stroke="#f5f2ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f5f2ec', margin: 0 }}>
                Venta creada exitosamente. Redirigiendo...
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {submitError && (
          <div
            style={{
              marginBottom: '24px',
              borderRadius: '8px',
              border: '1px solid #d4543b',
              backgroundColor: '#262422',
              padding: '16px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '12px', flexShrink: 0 }}>
                <circle cx="10" cy="10" r="10" fill="#d4543b" />
                <path d="M7 7l6 6M13 7l-6 6" stroke="#f5f2ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f5f2ec', margin: 0 }}>
                {submitError}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ----------------------------------------------------------------- */}
          {/* Section: Cliente */}
          {/* ----------------------------------------------------------------- */}
          <section
            style={{
              backgroundColor: '#262422',
              borderRadius: '8px',
              border: '1px solid #363330',
              padding: '24px',
              transition: 'all 0.5s ease',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.05)',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#f5f2ec',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #363330 0%, #262422 100%)',
                  color: '#f5f2ec',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #363330',
                  flexShrink: 0,
                }}
              >
                1
              </span>
              Cliente
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Search / Name */}
              <div className="relative" ref={customerSearchRef}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Nombre y Apellido <span style={{ color: '#d4543b' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => handleCustomerSearchChange(e.target.value)}
                  onFocus={(e) => {
                    if (form.customerName.trim().length >= 2) {
                      searchCustomers(form.customerName);
                    }
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  placeholder="Buscar cliente existente o ingresar nuevo..."
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '14px 45px 14px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {isSearchingCustomers && (
                  <div style={{ position: 'absolute', right: '14px', top: '38px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #b8a89c',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  </div>
                )}

                {/* Dropdown */}
                {showCustomerDropdown && customers.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      zIndex: 50,
                      width: '100%',
                      marginTop: '4px',
                      backgroundColor: '#262422',
                      borderRadius: '4px',
                      border: '1px solid #363330',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                      maxHeight: '240px',
                      overflow: 'auto',
                    }}
                  >
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid #363330',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          color: '#f5f2ec',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#363330';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>
                          {customer.full_name}
                        </p>
                        {customer.phone && (
                          <p style={{ fontSize: '0.8rem', color: '#b8a89c', margin: '2px 0 0' }}>
                            📞 {customer.phone}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {showCustomerDropdown &&
                  form.customerName.trim().length >= 2 &&
                  !isSearchingCustomers &&
                  customers.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 50,
                        width: '100%',
                        marginTop: '4px',
                        backgroundColor: '#262422',
                        borderRadius: '4px',
                        border: '1px solid #363330',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                        padding: '12px 16px',
                      }}
                    >
                      <p style={{ fontSize: '0.85rem', color: '#b8a89c', margin: 0 }}>
                        No se encontraron clientes. Se creará uno nuevo al guardar.
                      </p>
                    </div>
                  )}
              </div>

              {/* Phone */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => handleChange('customerPhone', e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Address */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.customerAddress}
                  onChange={(e) => handleChange('customerAddress', e.target.value)}
                  placeholder="Ej: Av. Siempre Viva 742"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Section: Datos del Crédito */}
          {/* ----------------------------------------------------------------- */}
          <section
            style={{
              backgroundColor: '#262422',
              borderRadius: '8px',
              border: '1px solid #363330',
              padding: '24px',
              transition: 'all 0.5s ease',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.05)',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#f5f2ec',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #363330 0%, #262422 100%)',
                  color: '#f5f2ec',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #363330',
                  flexShrink: 0,
                }}
              >
                2
              </span>
              Datos del Crédito
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Product Items (Multi-product) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Productos <span style={{ color: '#d4543b' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {form.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => {
                            const newItems = [...form.items];
                            newItems[index] = { ...newItems[index], productName: e.target.value };
                            setForm((prev) => ({ ...prev, items: newItems }));
                          }}
                          placeholder={`Producto ${index + 1}`}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            backgroundColor: '#1e1d1b',
                            border: '1px solid #5a5248',
                            borderRadius: '4px',
                            color: '#f5f2ec',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#e8e4df';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#5a5248';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      <div style={{ width: '100px' }}>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...form.items];
                            newItems[index] = { ...newItems[index], quantity: parseInt(e.target.value, 10) || 1 };
                            setForm((prev) => ({ ...prev, items: newItems }));
                          }}
                          placeholder="Cant."
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            backgroundColor: '#1e1d1b',
                            border: '1px solid #5a5248',
                            borderRadius: '4px',
                            color: '#f5f2ec',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'all 0.3s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#e8e4df';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#5a5248';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = form.items.filter((_, i) => i !== index);
                            setForm((prev) => ({ ...prev, items: newItems }));
                          }}
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#3a2f2b',
                            color: '#d4543b',
                            border: '1px solid #5a3a33',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#4a3a35';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3a2f2b';
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { productName: '', quantity: 1 }] }))}
                  style={{
                    marginTop: '10px',
                    padding: '8px 14px',
                    backgroundColor: 'transparent',
                    color: '#b8a89c',
                    border: '1px dashed #5a5248',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#b8a89c';
                    e.currentTarget.style.color = '#e8e4df';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.color = '#b8a89c';
                  }}
                >
                  + Agregar otro producto
                </button>
              </div>

              {/* Sale Date */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Fecha de Venta
                </label>
                <input
                  type="date"
                  value={form.saleDate}
                  onChange={(e) => handleChange('saleDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Operation Number */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Número de Tarjeta / Operación
                </label>
                <input
                  type="text"
                  value={form.operationNumber}
                  onChange={(e) => handleChange('operationNumber', e.target.value)}
                  placeholder="Ej: T-00123"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Observaciones
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Notas adicionales sobre la venta..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    resize: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Section: Plan de Cuotas */}
          {/* ----------------------------------------------------------------- */}
          <section
            style={{
              backgroundColor: '#262422',
              borderRadius: '8px',
              border: '1px solid #363330',
              padding: '24px',
              transition: 'all 0.5s ease',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.05)',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#f5f2ec',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #363330 0%, #262422 100%)',
                  color: '#f5f2ec',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #363330',
                  flexShrink: 0,
                }}
              >
                3
              </span>
              Plan de Cuotas
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
              {/* Installment Amount */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Monto de Cuota <span style={{ color: '#d4543b' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#b8a89c',
                      fontSize: '0.9rem',
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.installmentAmount || ''}
                    onChange={(e) =>
                      handleChange('installmentAmount', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 28px',
                      backgroundColor: '#1e1d1b',
                      border: '1px solid #5a5248',
                      borderRadius: '4px',
                      color: '#f5f2ec',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#5a5248';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Installment Count */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#d3cdc4',
                    marginBottom: '6px',
                  }}
                >
                  Cantidad de Cuotas
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.installmentCount}
                  onChange={(e) =>
                    handleChange('installmentCount', parseInt(e.target.value, 10) || 1)
                  }
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1e1d1b',
                    border: '1px solid #5a5248',
                    borderRadius: '4px',
                    color: '#f5f2ec',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(232, 228, 223, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#5a5248';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Total Calculated — Estilo destacado como precio de producto */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #363330 0%, #262422 100%)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #363330',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.05)',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#b8a89c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 6px',
                  }}
                >
                  Total Financiado
                </p>
                <p
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: '#f5f2ec',
                    margin: '0 0 4px',
                    lineHeight: 1.2,
                  }}
                >
                  ${totalFinanciado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#d3cdc4', margin: 0 }}>
                  {form.installmentCount} cuotas de ${form.installmentAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Actions */}
          {/* ----------------------------------------------------------------- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #363330',
            }}
          >
            <Link
              href="/admin/cuentas-corrientes"
              style={{
                fontSize: '0.85rem',
                color: '#b8a89c',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = '#e8e4df';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = '#b8a89c';
              }}
            >
              Cancelar
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isSubmitting && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#d3cdc4' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #b8a89c',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '8px',
                    }}
                  />
                  Guardando...
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || submitSuccess}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4a433a',
                  color: '#f5f2ec',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.4s ease',
                  opacity: isSubmitting || submitSuccess ? 0.55 : 1,
                  cursor: isSubmitting || submitSuccess ? 'not-allowed' : 'pointer',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.05)',
                }}
                onMouseEnter={(e) => {
                  if (!(isSubmitting || submitSuccess)) {
                    e.currentTarget.style.backgroundColor = '#5a5248';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4a433a';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {submitSuccess ? '✓ Creado' : 'Crear Venta a Crédito'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Keyframe para spinner */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
