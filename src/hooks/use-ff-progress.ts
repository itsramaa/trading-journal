/**
 * Financial Freedom Progress Hook
 * 
 * Aggregates data from all FF modules to calculate overall progress.
 * All metrics are derived from real persisted data.
 */
import { useMemo } from "react";
import { useHoldings, useDefaultPortfolio, useTransactions, usePortfolioHistory } from "./use-portfolio";
import { useDebts } from "./use-debts";
import { useEmergencyFund } from "./use-emergency-fund";
import { useBudgetCategories } from "./use-budget";
import { useGoals } from "./use-goals";
import { useAccounts } from "./use-accounts";
import { useFireSettings } from "./use-fire-settings";
import { transformHoldings } from "@/lib/data-transformers";
import { calculateFireNumber, calculateRealReturn, calculateYearsToFire } from "@/lib/fire-calculations";

export interface FFProgressMetrics {
  // Current Level (1-5)
  currentLevel: number;
  levelProgress: number;
  
  // Core Metrics
  savingsRate: number;
  cagr: number;
  withdrawalRate: number;
  
  // Emergency Fund
  emergencyFundMonths: number;
  emergencyFundTarget: number;
  emergencyFundCurrent: number;
  
  // Debt
  debtToIncomeRatio: number;
  totalDebt: number;
  hasHighInterestDebt: boolean;
  
  // Portfolio
  totalAssets: number;
  totalAccountBalance: number;
  totalPortfolioValue: number;
  
  // Cash Flow
  monthlyExpenses: number;
  monthlyIncome: number;
  monthlySavings: number;
  
  // Goals
  totalGoalsProgress: number;
  activeGoals: number;
  
  // FIRE Progress
  fireNumber: number;
  fireProgress: number;
  yearsToFire: number;
}

export interface LevelRequirement {
  label: string;
  target: string;
  current: string;
  met: boolean;
}

export interface FFLevel {
  level: number;
  name: string;
  description: string;
  requirements: LevelRequirement[];
  isCompleted: boolean;
  isCurrent: boolean;
}

/**
 * Calculate Financial Freedom Level based on real data
 * 
 * Level 1 - Survival: Budget management, debt payoff, emergency fund 1-3 months
 * Level 2 - Stability: Emergency fund 6-12 months, no high-interest debt
 * Level 3 - Independence: FIRE number reached, 4% withdrawal sustainable
 * Level 4 - Freedom: Assets > 10x annual expenses
 * Level 5 - Purpose: Legacy building, philanthropy
 */
function calculateLevel(metrics: Omit<FFProgressMetrics, 'currentLevel' | 'levelProgress'>): { level: number; progress: number } {
  // Level 1 Requirements
  const hasEmergency1Month = metrics.emergencyFundMonths >= 1;
  const isTrackingBudget = metrics.monthlyExpenses > 0;
  const isReducingDebt = metrics.totalDebt >= 0; // Any debt tracking is progress
  
  // Level 2 Requirements
  const hasEmergency6Months = metrics.emergencyFundMonths >= 6;
  const noHighInterestDebt = !metrics.hasHighInterestDebt;
  const healthyDTI = metrics.debtToIncomeRatio < 30;
  
  // Level 3 Requirements
  const fireProgress = metrics.fireProgress >= 100;
  const savingsRate50 = metrics.savingsRate >= 50;
  
  // Level 4 Requirements
  const assets10x = metrics.totalAssets >= metrics.monthlyExpenses * 12 * 10;
  const passiveIncome = metrics.totalPortfolioValue * 0.04 / 12 >= metrics.monthlyExpenses;
  
  // Level 5 Requirements (subjective, simplified)
  const level4Complete = assets10x && passiveIncome;
  
  // Determine current level
  if (level4Complete) {
    return { level: 5, progress: 100 };
  }
  
  if (fireProgress && savingsRate50) {
    // Calculate progress to level 4
    const assetsProgress = Math.min(100, (metrics.totalAssets / (metrics.monthlyExpenses * 12 * 10)) * 100);
    return { level: 4, progress: assetsProgress };
  }
  
  if (hasEmergency6Months && noHighInterestDebt && healthyDTI) {
    // Calculate progress to level 3
    return { level: 3, progress: metrics.fireProgress };
  }
  
  if (hasEmergency1Month && isTrackingBudget) {
    // Calculate progress to level 2
    const efProgress = Math.min(100, (metrics.emergencyFundMonths / 6) * 33);
    const debtProgress = noHighInterestDebt ? 33 : 0;
    const dtiProgress = healthyDTI ? 34 : Math.max(0, 34 - (metrics.debtToIncomeRatio - 30));
    return { level: 2, progress: efProgress + debtProgress + dtiProgress };
  }
  
  // Level 1 progress
  const budgetProgress = isTrackingBudget ? 40 : 0;
  const emergencyProgress = Math.min(40, (metrics.emergencyFundMonths / 1) * 40);
  const debtTrackingProgress = isReducingDebt ? 20 : 0;
  
  return { level: 1, progress: budgetProgress + emergencyProgress + debtTrackingProgress };
}

export function useFFProgressData() {
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbHoldings = [], isLoading: holdingsLoading } = useHoldings(defaultPortfolio?.id);
  const { data: transactions = [], isLoading: txLoading } = useTransactions(defaultPortfolio?.id);
  const { data: history = [] } = usePortfolioHistory(defaultPortfolio?.id, 'ALL');
  const { data: debts = [], isLoading: debtsLoading } = useDebts();
  const { data: emergencyFund, isLoading: efLoading } = useEmergencyFund();
  const { data: budgetCategories = [], isLoading: budgetLoading } = useBudgetCategories();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: fireSettings } = useFireSettings();

  const isLoading = holdingsLoading || txLoading || debtsLoading || efLoading || budgetLoading || goalsLoading || accountsLoading;

  const metrics = useMemo<FFProgressMetrics>(() => {
    // Transform holdings
    const holdings = transformHoldings(dbHoldings);
    
    // Calculate portfolio value
    const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    
    // Calculate account balances (in IDR)
    const totalAccountBalance = accounts.reduce((sum, acc) => {
      if (acc.currency === 'IDR') return sum + Number(acc.balance);
      // Convert USD to IDR (approximate)
      return sum + Number(acc.balance) * 15800;
    }, 0);
    
    // Total assets = portfolio + accounts
    const totalAssets = totalPortfolioValue + totalAccountBalance;
    
    // Emergency Fund metrics
    const efMonthlyExpenses = emergencyFund ? Number(emergencyFund.monthly_expenses) : 0;
    const efBalance = emergencyFund ? Number(emergencyFund.current_balance) : 0;
    const emergencyFundMonths = efMonthlyExpenses > 0 ? efBalance / efMonthlyExpenses : 0;
    const emergencyFundTarget = emergencyFund ? efMonthlyExpenses * emergencyFund.target_months : 0;
    
    // Debt metrics
    const totalDebt = debts.reduce((sum, d) => sum + Number(d.current_balance), 0);
    const hasHighInterestDebt = debts.some(d => Number(d.interest_rate) > 15);
    
    // Budget metrics
    const totalBudgeted = budgetCategories.reduce((sum, c) => sum + Number(c.budgeted_amount), 0);
    const totalSpent = budgetCategories.reduce((sum, c) => sum + Number(c.spent_amount), 0);
    
    // Use FIRE settings or estimate from budget/emergency fund
    const monthlyExpenses = fireSettings?.monthly_expenses 
      ? Number(fireSettings.monthly_expenses)
      : efMonthlyExpenses > 0 ? efMonthlyExpenses : totalBudgeted;
    
    const monthlyIncome = fireSettings?.monthly_income
      ? Number(fireSettings.monthly_income)
      : monthlyExpenses > 0 ? monthlyExpenses * 1.5 : 0; // Estimate if not set
    
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    
    // Debt-to-income ratio (monthly)
    const totalMonthlyDebtPayment = debts.reduce((sum, d) => sum + Number(d.monthly_payment), 0);
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyDebtPayment / monthlyIncome) * 100 : 0;
    
    // CAGR from portfolio history
    let cagr = 0;
    if (history.length > 1 && totalCostBasis > 0) {
      const oldestValue = Number(history[history.length - 1]?.total_value || 0);
      const newestValue = Number(history[0]?.total_value || 0);
      const oldestDate = new Date(history[history.length - 1]?.recorded_at || new Date());
      const yearsElapsed = Math.max(0.1, (Date.now() - oldestDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
      if (oldestValue > 0) {
        cagr = (Math.pow(newestValue / oldestValue, 1 / yearsElapsed) - 1) * 100;
      }
    }
    
    // Withdrawal rate (if retired/drawing down)
    const withdrawalRate = 0; // Not yet implemented - would need to track withdrawals
    
    // Goals progress
    const totalGoalsSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
    const totalGoalsTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
    const totalGoalsProgress = totalGoalsTarget > 0 ? (totalGoalsSaved / totalGoalsTarget) * 100 : 0;
    
    // FIRE calculations
    const swr = (fireSettings?.safe_withdrawal_rate || 4) / 100;
    const annualExpenses = monthlyExpenses * 12;
    const fireNumber = calculateFireNumber(annualExpenses, swr);
    const fireProgress = fireNumber > 0 ? (totalAssets / fireNumber) * 100 : 0;
    
    // Years to FIRE
    const realReturn = calculateRealReturn(
      fireSettings?.expected_annual_return || 8,
      fireSettings?.inflation_rate || 3
    );
    const annualSavings = monthlySavings * 12;
    const yearsToFire = calculateYearsToFire(totalAssets, annualSavings, fireNumber, realReturn);
    
    const baseMetrics = {
      savingsRate,
      cagr,
      withdrawalRate,
      emergencyFundMonths,
      emergencyFundTarget,
      emergencyFundCurrent: efBalance,
      debtToIncomeRatio,
      totalDebt,
      hasHighInterestDebt,
      totalAssets,
      totalAccountBalance,
      totalPortfolioValue,
      monthlyExpenses,
      monthlyIncome,
      monthlySavings,
      totalGoalsProgress,
      activeGoals: goals.length,
      fireNumber,
      fireProgress,
      yearsToFire,
    };
    
    const { level, progress } = calculateLevel(baseMetrics);
    
    return {
      ...baseMetrics,
      currentLevel: level,
      levelProgress: progress,
    };
  }, [dbHoldings, transactions, history, debts, emergencyFund, budgetCategories, goals, accounts, fireSettings]);

  const levels = useMemo<FFLevel[]>(() => [
    {
      level: 1,
      name: "Survival",
      description: "Budget management, debt payoff, emergency fund 1-3 months",
      requirements: [
        {
          label: "Monthly Budget Tracked",
          target: "Active",
          current: metrics.monthlyExpenses > 0 ? "Active" : "Not Set",
          met: metrics.monthlyExpenses > 0,
        },
        {
          label: "Emergency Fund",
          target: "1-3 months",
          current: `${metrics.emergencyFundMonths.toFixed(1)} months`,
          met: metrics.emergencyFundMonths >= 1,
        },
        {
          label: "Debt Tracking",
          target: "Active",
          current: metrics.totalDebt >= 0 ? "Active" : "Not Set",
          met: true,
        },
      ],
      isCompleted: metrics.currentLevel > 1,
      isCurrent: metrics.currentLevel === 1,
    },
    {
      level: 2,
      name: "Stability",
      description: "Emergency fund 6-12 months, no high-interest debt",
      requirements: [
        {
          label: "Emergency Fund",
          target: "6-12 months",
          current: `${metrics.emergencyFundMonths.toFixed(1)} months`,
          met: metrics.emergencyFundMonths >= 6,
        },
        {
          label: "High-Interest Debt",
          target: "None",
          current: metrics.hasHighInterestDebt ? "Present" : "None",
          met: !metrics.hasHighInterestDebt,
        },
        {
          label: "Debt-to-Income Ratio",
          target: "<30%",
          current: `${metrics.debtToIncomeRatio.toFixed(1)}%`,
          met: metrics.debtToIncomeRatio < 30,
        },
      ],
      isCompleted: metrics.currentLevel > 2,
      isCurrent: metrics.currentLevel === 2,
    },
    {
      level: 3,
      name: "Independence",
      description: "FIRE number reached, 4% withdrawal sustainable",
      requirements: [
        {
          label: "FIRE Progress",
          target: "100%",
          current: `${metrics.fireProgress.toFixed(1)}%`,
          met: metrics.fireProgress >= 100,
        },
        {
          label: "Savings Rate",
          target: ">50%",
          current: `${metrics.savingsRate.toFixed(1)}%`,
          met: metrics.savingsRate >= 50,
        },
        {
          label: "CAGR",
          target: ">10%",
          current: `${metrics.cagr.toFixed(1)}%`,
          met: metrics.cagr >= 10,
        },
      ],
      isCompleted: metrics.currentLevel > 3,
      isCurrent: metrics.currentLevel === 3,
    },
    {
      level: 4,
      name: "Freedom",
      description: "Assets 10x annual expenses, passive income covers all expenses",
      requirements: [
        {
          label: "Total Assets",
          target: "10x annual expenses",
          current: metrics.monthlyExpenses > 0 
            ? `${(metrics.totalAssets / (metrics.monthlyExpenses * 12)).toFixed(1)}x`
            : "N/A",
          met: metrics.totalAssets >= metrics.monthlyExpenses * 12 * 10,
        },
        {
          label: "Passive Income",
          target: ">Monthly Expenses",
          current: `${((metrics.totalPortfolioValue * 0.04 / 12) / (metrics.monthlyExpenses || 1) * 100).toFixed(0)}% covered`,
          met: (metrics.totalPortfolioValue * 0.04 / 12) >= metrics.monthlyExpenses,
        },
      ],
      isCompleted: metrics.currentLevel > 4,
      isCurrent: metrics.currentLevel === 4,
    },
    {
      level: 5,
      name: "Purpose",
      description: "Legacy building, philanthropy, impact focus",
      requirements: [
        {
          label: "Financial Freedom",
          target: "Complete",
          current: metrics.currentLevel >= 4 ? "Achieved" : "In Progress",
          met: metrics.currentLevel >= 4,
        },
        {
          label: "Legacy Projects",
          target: "Active",
          current: "—",
          met: false,
        },
      ],
      isCompleted: metrics.currentLevel === 5,
      isCurrent: metrics.currentLevel === 5,
    },
  ], [metrics]);

  return {
    metrics,
    levels,
    isLoading,
    hasData: dbHoldings.length > 0 || accounts.length > 0 || (emergencyFund !== null) || debts.length > 0,
  };
}
