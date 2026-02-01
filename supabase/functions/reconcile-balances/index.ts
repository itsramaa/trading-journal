/**
 * Balance Reconciliation Edge Function
 * Verifies balance integrity by comparing stored balances with transaction sums
 * 
 * Features:
 * - Detects discrepancies between stored balance and calculated balance
 * - Logs discrepancies for audit trail
 * - Optional auto-fix for small discrepancies
 * - Generates reconciliation report
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse, handleCors, logError } from "../_shared/error-response.ts";

interface ReconciliationRequest {
  autoFix?: boolean;           // Whether to auto-fix small discrepancies
  autoFixThreshold?: number;   // Max discrepancy amount to auto-fix (default: 10)
  accountId?: string;          // Specific account to reconcile (optional)
}

interface DiscrepancyRecord {
  accountId: string;
  accountName: string;
  expectedBalance: number;
  actualBalance: number;
  discrepancy: number;
  autoFixed: boolean;
}

interface ReconciliationResult {
  accountsChecked: number;
  discrepanciesFound: number;
  autoFixed: number;
  requiresReview: number;
  discrepancies: DiscrepancyRecord[];
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization required', 401, 'AUTH_FAILED');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return createErrorResponse('Invalid user session', 401, 'AUTH_FAILED');
    }

    // Parse request body
    const body: ReconciliationRequest = await req.json().catch(() => ({}));
    const autoFix = body.autoFix ?? false;
    const autoFixThreshold = body.autoFixThreshold ?? 10;
    const specificAccountId = body.accountId;

    // Fetch user's accounts
    let accountsQuery = supabase
      .from('accounts')
      .select('id, name, balance, account_type')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (specificAccountId) {
      accountsQuery = accountsQuery.eq('id', specificAccountId);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      logError('reconcile-balances', accountsError, { userId: user.id });
      return createErrorResponse('Failed to fetch accounts', 500);
    }

    if (!accounts || accounts.length === 0) {
      return createSuccessResponse<ReconciliationResult>({
        accountsChecked: 0,
        discrepanciesFound: 0,
        autoFixed: 0,
        requiresReview: 0,
        discrepancies: [],
        timestamp: new Date().toISOString(),
      });
    }

    const discrepancies: DiscrepancyRecord[] = [];
    let autoFixedCount = 0;

    // Process each account
    for (const account of accounts) {
      // Calculate expected balance from transactions
      const { data: transactions, error: txError } = await supabase
        .from('account_transactions')
        .select('transaction_type, amount')
        .eq('account_id', account.id);

      if (txError) {
        logError('reconcile-balances', txError, { accountId: account.id });
        continue;
      }

      // Calculate expected balance from transactions
      let expectedBalance = 0;
      for (const tx of transactions || []) {
        if (['deposit', 'transfer_in', 'income'].includes(tx.transaction_type)) {
          expectedBalance += Number(tx.amount);
        } else if (['withdrawal', 'transfer_out', 'expense'].includes(tx.transaction_type)) {
          expectedBalance -= Number(tx.amount);
        }
      }

      const actualBalance = Number(account.balance);
      const discrepancy = expectedBalance - actualBalance;

      // Check for discrepancy (tolerance: 0.01)
      if (Math.abs(discrepancy) > 0.01) {
        const record: DiscrepancyRecord = {
          accountId: account.id,
          accountName: account.name,
          expectedBalance,
          actualBalance,
          discrepancy,
          autoFixed: false,
        };

        // Auto-fix small discrepancies if enabled
        if (autoFix && Math.abs(discrepancy) <= autoFixThreshold) {
          const { error: updateError } = await supabase
            .from('accounts')
            .update({ balance: expectedBalance, updated_at: new Date().toISOString() })
            .eq('id', account.id);

          if (!updateError) {
            record.autoFixed = true;
            autoFixedCount++;

            // Log the auto-fix in discrepancies table
            await supabase.from('account_balance_discrepancies').insert({
              user_id: user.id,
              account_id: account.id,
              expected_balance: expectedBalance,
              actual_balance: actualBalance,
              discrepancy,
              resolved: true,
              resolved_at: new Date().toISOString(),
              resolution_method: 'auto_fix',
              resolution_notes: `Auto-fixed discrepancy of ${discrepancy.toFixed(2)} (below threshold of ${autoFixThreshold})`,
            });
          }
        } else {
          // Log discrepancy for manual review
          await supabase.from('account_balance_discrepancies').insert({
            user_id: user.id,
            account_id: account.id,
            expected_balance: expectedBalance,
            actual_balance: actualBalance,
            discrepancy,
            resolved: false,
            resolution_notes: Math.abs(discrepancy) > autoFixThreshold
              ? `Discrepancy exceeds auto-fix threshold (${autoFixThreshold})`
              : 'Auto-fix not enabled',
          });
        }

        discrepancies.push(record);
      }
    }

    const result: ReconciliationResult = {
      accountsChecked: accounts.length,
      discrepanciesFound: discrepancies.length,
      autoFixed: autoFixedCount,
      requiresReview: discrepancies.length - autoFixedCount,
      discrepancies,
      timestamp: new Date().toISOString(),
    };

    return createSuccessResponse(result);

  } catch (error) {
    logError('reconcile-balances', error);
    return createErrorResponse(error, 500);
  }
});
