export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrateEnovaUrls } = await import('@/lib/services/enovaUrlMigration');
    try {
      const result = await migrateEnovaUrls();
      if (!result.alreadyDone) {
        console.log(
          `[startup] Enova images migrated: ${result.downloadedImages} downloaded, ${result.fixedUrls} URLs fixed` +
          (result.failedDownloads > 0 ? `, ${result.failedDownloads} failed` : '') +
          (result.missingSkus.length > 0 ? `, ${result.missingSkus.length} missing SKUs` : '')
        );
      }
    } catch (err) {
      console.error('[startup] Enova URL migration failed:', err instanceof Error ? err.message : err);
    }
  }
}
