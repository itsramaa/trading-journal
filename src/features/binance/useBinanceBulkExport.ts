/**
 * Binance Bulk Export Hooks
 * Phase 5: Bulk Export for Tax Reporting
 * 
 * Provides hooks for requesting and downloading bulk history exports:
 * - Transaction history (income, funding, commissions)
 * - Order history
 * - Trade history
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BinanceApiResponse } from "./types";

// Types
export type BulkExportType = 'transaction' | 'order' | 'trade';

export interface DownloadRequest {
  downloadId: string;
  type: BulkExportType;
  startTime: number;
  endTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface DownloadLink {
  downloadId: string;
  status: 'pending' | 'processing' | 'completed';
  url: string | null;
  expirationTimestamp: number | null;
  notified: boolean;
}

export interface ExportProgress {
  type: BulkExportType;
  status: 'idle' | 'requesting' | 'waiting' | 'ready' | 'downloading' | 'error';
  downloadId: string | null;
  url: string | null;
  error: string | null;
  pollCount: number;
}

// Helper to call edge function
async function callBinanceFutures<T>(
  action: string,
  params?: Record<string, unknown>
): Promise<BinanceApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke("binance-futures", {
    body: { action, ...params },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as BinanceApiResponse<T>;
}

/**
 * Request a download ID for bulk export
 */
export function useRequestBulkExport() {
  return useMutation({
    mutationFn: async ({
      type,
      startTime,
      endTime,
    }: {
      type: BulkExportType;
      startTime: number;
      endTime: number;
    }) => {
      const response = await callBinanceFutures<DownloadRequest>(
        "request-download",
        {
          downloadType: type,
          startTime,
          endTime,
        }
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to request download");
      }
      return response.data!;
    },
  });
}

/**
 * Get download link for a previously requested export
 */
export function useGetDownloadLink() {
  return useMutation({
    mutationFn: async ({
      type,
      downloadId,
    }: {
      type: BulkExportType;
      downloadId: string;
    }) => {
      const response = await callBinanceFutures<DownloadLink>(
        "get-download",
        {
          downloadType: type,
          downloadId,
        }
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to get download link");
      }
      return response.data!;
    },
  });
}

/**
 * Complete bulk export workflow with polling
 * Manages the entire export process: request -> poll -> download
 */
export function useBulkExportWorkflow() {
  const [progress, setProgress] = useState<Record<BulkExportType, ExportProgress>>({
    transaction: { type: 'transaction', status: 'idle', downloadId: null, url: null, error: null, pollCount: 0 },
    order: { type: 'order', status: 'idle', downloadId: null, url: null, error: null, pollCount: 0 },
    trade: { type: 'trade', status: 'idle', downloadId: null, url: null, error: null, pollCount: 0 },
  });

  const requestExport = useRequestBulkExport();
  const getDownload = useGetDownloadLink();

  const MAX_POLLS = 30; // Max 30 polls (5 minutes with 10s interval)
  const POLL_INTERVAL = 10000; // 10 seconds

  const startExport = useCallback(async (
    type: BulkExportType,
    startTime: Date,
    endTime: Date
  ) => {
    // Reset progress
    setProgress(prev => ({
      ...prev,
      [type]: { type, status: 'requesting', downloadId: null, url: null, error: null, pollCount: 0 },
    }));

    try {
      // Step 1: Request download ID
      const request = await requestExport.mutateAsync({
        type,
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
      });

      setProgress(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'waiting', downloadId: request.downloadId },
      }));

      // Step 2: Poll for completion
      let pollCount = 0;
      const poll = async (): Promise<string | null> => {
        if (pollCount >= MAX_POLLS) {
          throw new Error('Export timed out. Please try again.');
        }

        pollCount++;
        setProgress(prev => ({
          ...prev,
          [type]: { ...prev[type], pollCount },
        }));

        const result = await getDownload.mutateAsync({
          type,
          downloadId: request.downloadId,
        });

        if (result.status === 'completed' && result.url) {
          return result.url;
        }

        // Wait and poll again
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        return poll();
      };

      const url = await poll();

      if (url) {
        setProgress(prev => ({
          ...prev,
          [type]: { ...prev[type], status: 'ready', url },
        }));
        return url;
      }

      throw new Error('Export failed - no download URL received');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setProgress(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'error', error: errorMessage },
      }));
      throw error;
    }
  }, [requestExport, getDownload]);

  const downloadFile = useCallback((url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const resetProgress = useCallback((type: BulkExportType) => {
    setProgress(prev => ({
      ...prev,
      [type]: { type, status: 'idle', downloadId: null, url: null, error: null, pollCount: 0 },
    }));
  }, []);

  return {
    progress,
    startExport,
    downloadFile,
    resetProgress,
    isExporting: Object.values(progress).some(p => 
      p.status === 'requesting' || p.status === 'waiting'
    ),
  };
}

/**
 * Get export type label for display
 */
export function getExportTypeLabel(type: BulkExportType): string {
  switch (type) {
    case 'transaction':
      return 'Transaction History';
    case 'order':
      return 'Order History';
    case 'trade':
      return 'Trade History';
  }
}

/**
 * Get export type description
 */
export function getExportTypeDescription(type: BulkExportType): string {
  switch (type) {
    case 'transaction':
      return 'Income, funding fees, commissions, and transfers';
    case 'order':
      return 'All orders including cancelled and filled';
    case 'trade':
      return 'Executed trades with P&L and commission details';
  }
}
