import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminAuditLogInput = {
  adminUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAdminAuditLog(
  supabase: SupabaseClient,
  input: AdminAuditLogInput
): Promise<void> {
  const { error } = await supabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: input.adminUserId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      metadata: input.metadata ?? {},
    });

  if (error) {
    throw error;
  }
}
