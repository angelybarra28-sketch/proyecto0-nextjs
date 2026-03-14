'use client';

import { useState } from 'react';
import styles from '@/styles/Newsletter.module.css';

export default function Newsletter() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('¡Gracias por suscribirte!');
    setEmail('');
  };

  return (
    <section>
      <div className={styles.newsletterContainer}>
        <h2>¡No te pierdas nuestras ofertas!</h2>
        <p>Todas las semanas promos increíbles. Suscríbete a nuestro newsletter</p>
        <form className={styles.newsletterForm} onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Tu email aquí..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Enviar</button>
        </form>
      </div>
    </section>
  );
}
