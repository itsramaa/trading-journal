/**
 * Audit Logger - Immutable audit trail for compliance (Phase 6)
 * Logs user actions to audit_logs table for API access tracking & trade data changes
 */
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | 'api_key_saved'
  | 'api_key_deleted'
  | 'api_key_validated'
  | 'trade_created'
  | 'trade_closed'
  | 'trade_deleted'
  | 'trade_restored'
  | 'trade_enriched'
  | 'settings_changed'
  | 'risk_profile_updated'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed';

export type AuditEntityType =
  | 'exchange_credential'
  | 'trade_entry'
  | 'user_settings'
  | 'risk_profile'
  | 'sync_operation';

interface AuditLogParams {
  action: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event. Fire-and-forget — does not throw on failure.
 */
export async function logAuditEvent(userId: string, params: AuditLogParams): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: params.action,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        metadata: (params.metadata || {}) as any,
      }]);
  } catch (error) {
    // Audit logging should never block user operations
    console.warn('[AuditLog] Failed to log event:', params.action, error);
  }
}
