export type TestDbEnvironment = {
  TEST_SUPABASE_URL: string;
  TEST_SUPABASE_SERVICE_ROLE_KEY: string;
};

// Runtime helpers live in testDb.mjs so Node's built-in test runner can execute
// the DB suite without adding a TypeScript test transpiler.
