export async function downloadBackup(): Promise<string> {
  const response = await fetch('/api/admin/backup/export', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || 'Error al generar backup');
  }

  const blob = await response.blob();

  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename=(.+)/);
  const filename = match?.[1] ?? `backup-${new Date().toISOString().slice(0, 16).replace('T', '-')}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

export interface ValidationSummary {
  tables: number;
  rows: number;
  checksum: string;
  version: string;
  exportedAt: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: ValidationSummary;
}

export async function validateBackupFile(file: File): Promise<ValidationResponse> {
  const text = await file.text();

  const response = await fetch('/api/admin/backup/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: text,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || 'Error al validar backup');
  }

  return response.json();
}
