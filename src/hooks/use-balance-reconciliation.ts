/**
 * Balance Reconciliation Hook
 * Triggers and manages balance reconciliation checks
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface StoredDiscrepancy {
  id: string;
  account_id: string;
  expected_balance: number;
  actual_balance: number;
  discrepancy: number;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolution_method: string | null;
  resolution_notes: string | null;
}

export function useBalanceReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<ReconciliationResult | null>(null);

  // Fetch unresolved discrepancies
  const {
    data: unresolvedDiscrepancies,
    isLoading: isLoadingDiscrepancies,
    refetch: refetchDiscrepancies,
  } = useQuery({
    queryKey: ["balance-discrepancies", "unresolved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_balance_discrepancies")
        .select("*")
        .eq("resolved", false)
        .order("detected_at", { ascending: false });

      if (error) throw error;
      return data as StoredDiscrepancy[];
    },
  });

  // Run reconciliation
  const runReconciliation = useMutation({
    mutationFn: async (options: { autoFix?: boolean; autoFixThreshold?: number; accountId?: string }) => {
      const { data, error } = await supabase.functions.invoke("reconcile-balances", {
        body: options,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Reconciliation failed");
      
      return data.data as ReconciliationResult;
    },
    onSuccess: (result) => {
      setLastResult(result);
      
      if (result.discrepanciesFound === 0) {
        toast({
          title: "Reconciliation Complete",
          description: `Checked ${result.accountsChecked} accounts. All balances are correct.`,
        });
      } else if (result.autoFixed > 0) {
        toast({
          title: "Reconciliation Complete",
          description: `Found ${result.discrepanciesFound} discrepancies. Auto-fixed ${result.autoFixed}, ${result.requiresReview} require manual review.`,
          variant: result.requiresReview > 0 ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Discrepancies Found",
          description: `Found ${result.discrepanciesFound} balance discrepancies requiring manual review.`,
          variant: "destructive",
        });
      }

      // Refresh discrepancies list
      refetchDiscrepancies();
      // Refresh accounts data
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Reconciliation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Resolve discrepancy manually
  const resolveDiscrepancy = useMutation({
    mutationFn: async ({
      discrepancyId,
      method,
      notes,
      applyFix,
    }: {
      discrepancyId: string;
      method: "manual" | "ignored";
      notes?: string;
      applyFix?: boolean;
    }) => {
      // If applying fix, first get discrepancy details and update account
      if (applyFix && method === "manual") {
        const { data: discrepancy, error: fetchError } = await supabase
          .from("account_balance_discrepancies")
          .select("account_id, expected_balance")
          .eq("id", discrepancyId)
          .single();

        if (fetchError) throw fetchError;

        // Update account balance
        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            balance: discrepancy.expected_balance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", discrepancy.account_id);

        if (updateError) throw updateError;
      }

      // Mark discrepancy as resolved
      const { error } = await supabase
        .from("account_balance_discrepancies")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_method: method,
          resolution_notes: notes || (applyFix ? "Balance corrected to expected value" : "Discrepancy acknowledged"),
        })
        .eq("id", discrepancyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Discrepancy Resolved",
        description: "The balance discrepancy has been marked as resolved.",
      });
      refetchDiscrepancies();
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Resolve",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return {
    // State
    lastResult,
    unresolvedDiscrepancies,
    isLoadingDiscrepancies,
    hasUnresolvedDiscrepancies: (unresolvedDiscrepancies?.length ?? 0) > 0,
    unresolvedCount: unresolvedDiscrepancies?.length ?? 0,

    // Actions
    runReconciliation: runReconciliation.mutate,
    isReconciling: runReconciliation.isPending,

    resolveDiscrepancy: resolveDiscrepancy.mutate,
    isResolving: resolveDiscrepancy.isPending,

    refetchDiscrepancies,
  };
}
