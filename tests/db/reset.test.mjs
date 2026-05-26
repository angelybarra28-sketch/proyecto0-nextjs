import test from 'node:test';
import { createTestDbClient } from '../helpers/testDb.mjs';
import { resetDatabase } from '../helpers/resetDatabase.mjs';

const dbTest = test;

dbTest('reset helper is callable for manual db cleanup runs', async () => {
  const supabase = createTestDbClient();
  await resetDatabase(supabase, 'manual-reset-placeholder');
});
