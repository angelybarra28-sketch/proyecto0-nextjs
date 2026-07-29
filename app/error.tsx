'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>Algo salió mal</h1>
      <p style={{ color: '#d3cdc4', marginBottom: '24px', maxWidth: '400px' }}>
        Ocurrió un error inesperado. Por favor intentá de nuevo.
      </p>
      <button
        onClick={() => reset()}
        style={{
          background: '#4a433a',
          color: '#f5f2ec',
          border: 'none',
          padding: '10px 24px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
