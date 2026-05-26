import { createAdminAuditLog, type AdminAuditLogInput } from '@/lib/repositories/adminAuditRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function logAdminAction(input: AdminAuditLogInput): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  try {
    await createAdminAuditLog(supabase, input);
  } catch (error) {
    // Audit logging must never break the operational flow, but failures are visible server-side.
    console.error('Error writing admin audit log:', error);
  }
}
