import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1e1d1b',
      color: '#f5f2ec',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '8px' }}>404</h1>
      <p style={{ color: '#d3cdc4', marginBottom: '24px' }}>
        Página no encontrada
      </p>
      <Link
        href="/"
        style={{
          color: '#f7c59f',
          textDecoration: 'none',
          fontSize: '14px',
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
