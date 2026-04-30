'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import styles from '@/styles/Auth.module.css';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    dni: '',
    nombreApellido: '',
    telefono: '',
    email: '',
    domicilio: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      // Login
      const success = login(formData.email, formData.password);
      if (success) {
        router.push('/');
      } else {
        setError('Email o contraseña incorrectos');
      }
    } else {
      // Registro
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }

      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      const result = register({
        dni: formData.dni,
        nombreApellido: formData.nombreApellido,
        telefono: formData.telefono,
        email: formData.email,
        domicilio: formData.domicilio,
        password: formData.password,
      });

      if (result.success) {
        router.push('/');
      } else {
        setError(result.message);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>

        <div className={styles.toggleButtons}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${isLogin ? styles.active : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${!isLogin ? styles.active : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Registrarse
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="dni">DNI</label>
                <input
                  type="text"
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  required
                  placeholder="Ingrese su DNI"
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="nombreApellido">Nombre y Apellido</label>
                <input
                  type="text"
                  id="nombreApellido"
                  name="nombreApellido"
                  value={formData.nombreApellido}
                  onChange={handleChange}
                  required
                  placeholder="Ingrese su nombre completo"
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  required
                  placeholder="Ingrese su teléfono"
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="domicilio">Domicilio</label>
                <input
                  type="text"
                  id="domicilio"
                  name="domicilio"
                  value={formData.domicilio}
                  onChange={handleChange}
                  required
                  placeholder="Ingrese su domicilio"
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">
              {isLogin ? 'Email / Usuario' : 'Email'}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={isLogin ? 'Email o usuario admin' : 'Ingrese su email'}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Ingrese su contraseña"
            />
          </div>

          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirme su contraseña"
                />
              </div>
            </>
          )}

          <button type="submit" className={styles.submitBtn}>
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        {!isLogin && (
          <p className={styles.loginHint}>
            ¿Ya tiene cuenta?{' '}
            <button type="button" onClick={() => setIsLogin(true)}>
              Iniciar Sesión
            </button>
          </p>
        )}

        {isLogin && (
          <p className={styles.loginHint}>
            ¿No tiene cuenta?{' '}
            <button type="button" onClick={() => setIsLogin(false)}>
              Registrarse
            </button>
          </p>
        )}
      </div>
    </div>
  );
}