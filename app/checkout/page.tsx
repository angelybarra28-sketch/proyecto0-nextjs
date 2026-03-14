'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import FloatingElements from '@/components/FloatingElements';
import { useCart } from '@/lib/cartContext';
import CartItem from '@/components/Cart/CartItem';
import CartSummary from '@/components/Cart/CartSummary';
import styles from '@/styles/Cart.module.css';
import checkoutStyles from '@/styles/Checkout.module.css';

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    location: '',
    paymentMethod: 'credit-card'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que los campos requeridos estén completos
    if (!formData.fullName || !formData.address || !formData.location) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (items.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    // Simular que se envió el pedido
    setOrderPlaced(true);
    setTimeout(() => {
      clearCart();
      setOrderPlaced(false);
      window.location.href = '/';
    }, 3000);
  };

  if (orderPlaced) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1e1d1b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f5f2ec'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#262422',
          borderRadius: '8px',
          border: '1px solid #363330'
        }}>
          <h1 style={{ marginBottom: '1rem', color: '#28a745' }}>✓ Pedido realizad correctamente</h1>
          <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Gracias por tu compra</p>
          <p style={{ color: '#b8a89c', marginBottom: '2rem' }}>Serás redirigido en breve...</p>
          <Link 
            href="/" 
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh', backgroundColor: '#1e1d1b', paddingBottom: '3rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 20px' }}>
          <h1 style={{ color: '#f5f2ec', marginBottom: '2rem', fontSize: '1.8rem' }}>
            Confirmar pedido!

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
                  <h2 style={{ color: '#f5f2ec', marginBottom: '1.5rem' }}>
                    Productos ({items.length})
                  </h2>
                  <div className={styles.cartList}>
                    {items.map((item) => (
                      <CartItem key={item.id} item={item} />
                    ))}
                  </div>
                </section>

                {/* Formulario de Entrega */}
                <form onSubmit={handlePlaceOrder} className={checkoutStyles.section}>
                  <h2 style={{ color: '#f5f2ec', marginBottom: '1.5rem' }}>
                    Detalles de entrega
                  </h2>

                  <div className={checkoutStyles.formGroup}>
                    <label htmlFor="fullName">Nombre completo *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div className={checkoutStyles.formRow}>
                    <div className={checkoutStyles.formGroup}>
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="correo@ejemplo.com"
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

                  <div className={checkoutStyles.formGroup}>
                    <label htmlFor="address">Dirección *</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Calle Principal 1234"
                    />
                  </div>

                  <div className={checkoutStyles.formGroup}>
                    <label htmlFor="location">Localidad *</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Buenos Aires"
                    />
                  </div>

                  {/* Método de Pago */}
                  <div className={checkoutStyles.section} style={{ marginTop: '2rem' }}>
                    <h3 style={{ color: '#f5f2ec', marginBottom: '1rem' }}>Método de pago</h3>
                    
                    <div className={checkoutStyles.paymentOptions}>
                      <label className={checkoutStyles.paymentOption}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="credit-card"
                          checked={formData.paymentMethod === 'credit-card'}
                          onChange={handleInputChange}
                        />
                        <span className={checkoutStyles.paymentLabel}>💳 Tarjeta de crédito/débito</span>
                      </label>

                      <label className={checkoutStyles.paymentOption}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="transfer"
                          checked={formData.paymentMethod === 'transfer'}
                          onChange={handleInputChange}
                        />
                        <span className={checkoutStyles.paymentLabel}>🏧 Transferencia bancaria</span>
                      </label>

                      <label className={checkoutStyles.paymentOption}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={formData.paymentMethod === 'cash'}
                          onChange={handleInputChange}
                        />
                        <span className={checkoutStyles.paymentLabel}>💵 Efectivo (retiro en local)</span>
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className={checkoutStyles.submitButton}
                  >
                    Confirmar pedido!
                  </button>
                </form>
              </div>

              {/* Right: Resumen */}
              <CartSummary />
            </div>
          )}
        </div>
      </main>

      <Footer />
      <FloatingElements />
    </>
  );
}
