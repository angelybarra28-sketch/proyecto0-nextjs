'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import { useCart } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import { persistPreSale } from '@/lib/services/preSaleClient';
import CartItem from '@/components/Cart/CartItem';
import CartSummary from '@/components/Cart/CartSummary';
import styles from '@/styles/Cart.module.css';
import checkoutStyles from '@/styles/Checkout.module.css';

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    location: '',
    phone: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData({
        fullName: user.nombreApellido || '',
        address: user.domicilio || '',
        location: '',
        phone: user.telefono || '',
      });
    }
  }, [isAuthenticated, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWhatsApp = async () => {
    if (items.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    const name = isAuthenticated ? (user?.nombreApellido || '') : formData.fullName;
    const phone = isAuthenticated ? (user?.telefono || '') : formData.phone;
    const address = isAuthenticated ? (user?.domicilio || '') : formData.address;
    const location = formData.location;

    const result = await persistPreSale(name, phone, address, location, items);

    if (!result.persisted) {
      alert('No se pudo registrar tu pedido en nuestro sistema. De todos modos, puedes continuar por WhatsApp.');
    }

    const phoneNumber = '5491158056418';

    let message = name
      ? `Hola, soy ${name}. Estoy interesado en estos productos:\n\n`
      : `Hola, estoy interesado en estos productos:\n\n`;

    items.forEach((item) => {
      const lineTotal = item.price * item.quantity;
      message += `- ${item.name} x${item.quantity} - $${lineTotal.toLocaleString('es-AR')}\n`;
    });

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (phone) message += `\nTeléfono: ${phone}`;
    if (address || location) {
      const parts = [address, location].filter(Boolean);
      message += `\nDirección: ${parts.join(', ')}`;
    }

    message += `\n\n8 cuotas de $${Math.round(total / 8).toLocaleString('es-AR')}`;
    message += `\n10 cuotas de $${Math.round(total / 10).toLocaleString('es-AR')}`;
    message += `\n12 cuotas de $${Math.round(total / 12).toLocaleString('es-AR')}`;
    message += `\n\nTotal: $${total.toLocaleString('es-AR')}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');

    clearCart();
  };

  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b', paddingBottom: '3rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.5rem 20px 2rem 20px' }}>

          {items.length === 0 ? (
            <div style={{
              backgroundColor: '#262422',
              border: '1px solid #363330',
              borderRadius: '8px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: '#f5f2ec'
            }}>
              <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Tu carrito está vacío</p>
              <Link
                href="/"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  padding: '0.75rem 2rem',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                Ver productos
              </Link>
            </div>
          ) : (
            <div className={styles.checkoutGrid}>
              {/* Left: Productos y Formulario */}
              <div className={checkoutStyles.leftColumn}>
                {/* Productos */}
                <section className={checkoutStyles.section}>
                  <h2 style={{ color: '#f5f2ec', marginBottom: '0.6rem' }}>
                    Productos ({items.length})
                  </h2>
                  <div className={styles.cartList}>
                    {items.map((item) => (
                      <CartItem key={item.id} item={item} />
                    ))}
                  </div>
                </section>

                {/* Formulario de Entrega - solo si NO esta logueado */}
                {!isAuthenticated && (
                  <div className={checkoutStyles.section}>
                    <h2 style={{ color: '#f5f2ec', marginBottom: '0.6rem' }}>
                      Datos de contacto (opcional)
                    </h2>

                    <div className={checkoutStyles.formRow}>
                      <div className={checkoutStyles.formGroup}>
                        <label htmlFor="fullName">Nombre completo</label>
                        <input
                          type="text"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>

                      <div className={checkoutStyles.formGroup}>
                        <label htmlFor="phone">Teléfono</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+54 9 11 XXXX-XXXX"
                        />
                      </div>
                    </div>

                    <div className={checkoutStyles.formRow}>
                      <div className={checkoutStyles.formGroup}>
                        <label htmlFor="address">Dirección</label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Ej: Calle Principal 1234"
                        />
                      </div>

                      <div className={checkoutStyles.formGroup}>
                        <label htmlFor="location">Localidad</label>
                        <input
                          type="text"
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="Ej: Buenos Aires"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Resumen */}
              <CartSummary onWhatsApp={handleWhatsApp} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
