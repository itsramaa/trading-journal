/**
 * Trade Entry Wizard State Machine Hook - 5-Step Flow
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  WizardStep,
  WizardState,
  PreValidationResult,
  TradeDetailsData,
  TradePriceLevels,
  ConfluenceData,
  FinalChecklistData,
} from "@/types/trade-wizard";
import { INITIAL_WIZARD_STATE } from "@/types/trade-wizard";
import type { PositionSizeResult } from "@/types/risk";
import type { TradingStrategyEnhanced } from "@/types/strategy";

interface WizardStore extends WizardState {
  // Navigation
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Data setters
  setPreValidation: (data: PreValidationResult) => void;
  setStrategy: (strategyId: string, details: TradingStrategyEnhanced) => void;
  setTradeDetails: (details: TradeDetailsData) => void;
  setPriceLevels: (levels: TradePriceLevels) => void;
  setConfluences: (data: ConfluenceData) => void;
  setPositionSizing: (result: PositionSizeResult) => void;
  setFinalChecklist: (data: FinalChecklistData) => void;
  setTradingAccount: (accountId: string, balance: number) => void;
  
  // Actions
  reset: () => void;
  isSubmitting: boolean;
  submitTrade: (userId: string) => Promise<boolean>;
}

const STEPS_ORDER: WizardStep[] = [
  'setup',
  'confluence',
  'sizing',
  'checklist',
  'confirmation',
];

export const useTradeEntryWizard = create<WizardStore>((set, get) => ({
  ...INITIAL_WIZARD_STATE,
  isSubmitting: false,

  goToStep: (step) => {
    set({ currentStep: step });
  },

  nextStep: () => {
    const { currentStep, completedSteps } = get();
    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    
    if (currentIndex < STEPS_ORDER.length - 1) {
      const newCompleted = completedSteps.includes(currentStep)
        ? completedSteps
        : [...completedSteps, currentStep];
      
      set({
        currentStep: STEPS_ORDER[currentIndex + 1],
        completedSteps: newCompleted,
      });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    
    if (currentIndex > 0) {
      set({ currentStep: STEPS_ORDER[currentIndex - 1] });
    }
  },

  setPreValidation: (data) => {
    set({ preValidation: data });
  },

  setStrategy: (strategyId, details) => {
    set({ selectedStrategyId: strategyId, strategyDetails: details });
  },

  setTradeDetails: (details) => {
    set({ tradeDetails: details });
  },

  setPriceLevels: (levels) => {
    set({ priceLevels: levels });
  },

  setConfluences: (data) => {
    set({ confluences: data });
  },

  setPositionSizing: (result) => {
    set({ positionSizing: result });
  },

  setFinalChecklist: (data) => {
    set({ finalChecklist: data });
  },

  setTradingAccount: (accountId, balance) => {
    set({ tradingAccountId: accountId, accountBalance: balance });
  },

  reset: () => {
    set(INITIAL_WIZARD_STATE);
  },

  submitTrade: async (userId) => {
    const state = get();
    set({ isSubmitting: true });

    try {
      const { tradeDetails, priceLevels, positionSizing, confluences, finalChecklist, tradingAccountId } = state;

      if (!tradeDetails || !priceLevels || !positionSizing) {
        throw new Error("Missing required trade data");
      }

      // Insert trade entry with AI quality score
      const { data, error } = await supabase
        .from("trade_entries")
        .insert({
          user_id: userId,
          trading_account_id: tradingAccountId || null,
          pair: tradeDetails.pair,
          direction: tradeDetails.direction,
          entry_price: priceLevels.entryPrice,
          stop_loss: priceLevels.stopLoss,
          take_profit: priceLevels.takeProfit,
          quantity: positionSizing.position_size,
          trade_date: new Date().toISOString().split('T')[0],
          status: 'open',
          confluence_score: confluences?.checkedItems.length || 0,
          confluences_met: confluences?.checkedItems || [],
          emotional_state: finalChecklist?.emotionalState || null,
          pre_trade_validation: state.preValidation as any,
          notes: finalChecklist?.tradeComment || null,
          ai_quality_score: finalChecklist?.aiQualityScore || null,
          ai_confidence: finalChecklist?.aiConfidence || confluences?.aiConfidence || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Link strategy if selected
      if (state.selectedStrategyId && data?.id) {
        await supabase
          .from("trade_entry_strategies")
          .insert({
            trade_entry_id: data.id,
            strategy_id: state.selectedStrategyId,
            user_id: userId,
          });
      }

      toast.success("Trade executed successfully!");
      set({ isSubmitting: false });
      return true;
    } catch (error: any) {
      console.error("Failed to submit trade:", error);
      toast.error(`Failed to execute trade: ${error.message}`);
      set({ isSubmitting: false });
      return false;
    }
  },
}));

// Selector hooks for components
export const useWizardStep = () => useTradeEntryWizard((state) => state.currentStep);
export const useWizardNavigation = () => useTradeEntryWizard((state) => ({
  goToStep: state.goToStep,
  nextStep: state.nextStep,
  prevStep: state.prevStep,
  currentStep: state.currentStep,
  completedSteps: state.completedSteps,
}));
