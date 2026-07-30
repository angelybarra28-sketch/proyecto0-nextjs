export interface BackupManifest {
  version: string;
  exportedAt: string;
  projectUrl: string;
  tables: string[];
  rowCounts: Record<string, number>;
  appVersion: string;
}

export interface BackupPayload {
  manifest: BackupManifest;
  data: Record<string, unknown[]>;
}
