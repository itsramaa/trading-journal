/**
 * FIRE (Financial Independence, Retire Early) Calculation Engine
 * 
 * All calculations are deterministic and documented.
 * Formula sources:
 * - Safe Withdrawal Rate: Trinity Study (1998)
 * - Real Return: Fisher Equation (nominal - inflation)
 * - Compound Growth: FV = PV * (1 + r)^n
 */

export interface FireInputs {
  currentAge: number;
  targetRetirementAge: number;
  currentSavings: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  expectedAnnualReturn: number; // Percentage (e.g., 7 for 7%)
  inflationRate: number; // Percentage
  safeWithdrawalRate: number; // Percentage (e.g., 4 for 4%)
  customFireNumber?: number; // Optional manual FIRE number override
}

export interface FireOutputs {
  fireNumber: number;
  yearsToFire: number;
  fireAge: number;
  requiredMonthlySaving: number;
  currentProgress: number; // Percentage
  projectionData: ProjectionPoint[];
  scenarios: FireScenarios;
  monthlyPassiveIncome: number;
  savingsRate: number;
}

export interface ProjectionPoint {
  age: number;
  year: number;
  savings: number;
  fireTarget: number;
  isFireReached: boolean;
}

export interface FireScenario {
  yearsToFire: number;
  fireAge: number;
  fireNumber: number;
  requiredMonthlySaving: number;
}

export interface FireScenarios {
  pessimistic: FireScenario; // -2% return, +1% inflation
  realistic: FireScenario; // Base values
  optimistic: FireScenario; // +2% return, -0.5% inflation
}

/**
 * Calculate FIRE Number using Safe Withdrawal Rate
 * Formula: FIRE Number = Annual Expenses / SWR
 * 
 * @param annualExpenses - Total yearly expenses
 * @param safeWithdrawalRate - Safe withdrawal rate (decimal, e.g., 0.04 for 4%)
 * @returns The target nest egg needed for financial independence
 */
export function calculateFireNumber(annualExpenses: number, safeWithdrawalRate: number): number {
  if (safeWithdrawalRate <= 0) return 0;
  return annualExpenses / safeWithdrawalRate;
}

/**
 * Calculate Real Return (inflation-adjusted)
 * Formula: Real Return = ((1 + nominal) / (1 + inflation)) - 1
 * Simplified: Real Return ≈ Nominal - Inflation (for small values)
 */
export function calculateRealReturn(nominalReturn: number, inflationRate: number): number {
  const nominal = nominalReturn / 100;
  const inflation = inflationRate / 100;
  return ((1 + nominal) / (1 + inflation)) - 1;
}

/**
 * Calculate years to reach FIRE using compound growth formula
 * Formula: Years = ln((FV * r + PMT) / (PV * r + PMT)) / ln(1 + r)
 * Where:
 *   FV = Future Value (FIRE number)
 *   PV = Present Value (current savings)
 *   PMT = Annual contribution
 *   r = Real return rate
 */
export function calculateYearsToFire(
  currentSavings: number,
  annualContribution: number,
  fireNumber: number,
  realReturn: number
): number {
  if (currentSavings >= fireNumber) return 0;
  if (realReturn <= 0) {
    // Without growth, simple calculation
    if (annualContribution <= 0) return Infinity;
    return (fireNumber - currentSavings) / annualContribution;
  }
  
  const r = realReturn;
  
  // Iterative approach for accuracy
  let years = 0;
  let portfolio = currentSavings;
  
  while (portfolio < fireNumber && years < 100) {
    portfolio = portfolio * (1 + r) + annualContribution;
    years++;
  }
  
  return years;
}

/**
 * Calculate required monthly savings to reach FIRE by target age
 * Uses reverse compound interest formula
 */
export function calculateRequiredMonthlySaving(
  currentSavings: number,
  fireNumber: number,
  yearsToRetirement: number,
  realReturn: number
): number {
  if (yearsToRetirement <= 0) return 0;
  if (currentSavings >= fireNumber) return 0;
  
  const r = realReturn;
  const n = yearsToRetirement;
  
  // Future value of current savings
  const futureValueOfPrincipal = currentSavings * Math.pow(1 + r, n);
  
  // Remaining amount needed
  const remainingNeeded = fireNumber - futureValueOfPrincipal;
  
  if (remainingNeeded <= 0) return 0;
  
  // Annual contribution needed (future value of annuity formula, solved for PMT)
  // FV = PMT * ((1 + r)^n - 1) / r
  // PMT = FV * r / ((1 + r)^n - 1)
  
  if (r === 0) {
    return remainingNeeded / (n * 12);
  }
  
  const annualPayment = remainingNeeded * r / (Math.pow(1 + r, n) - 1);
  
  return Math.max(0, annualPayment / 12);
}

/**
 * Generate projection data for wealth chart
 */
export function generateProjection(
  inputs: FireInputs,
  yearsToProject: number = 50
): ProjectionPoint[] {
  const { currentAge, currentSavings, monthlyExpenses, monthlyIncome, safeWithdrawalRate, customFireNumber } = inputs;
  const annualExpenses = monthlyExpenses * 12;
  const annualContribution = (monthlyIncome - monthlyExpenses) * 12;
  const fireNumber = customFireNumber && customFireNumber > 0 
    ? customFireNumber 
    : calculateFireNumber(annualExpenses, safeWithdrawalRate / 100);
  const realReturn = calculateRealReturn(inputs.expectedAnnualReturn, inputs.inflationRate);
  
  const projection: ProjectionPoint[] = [];
  let portfolio = currentSavings;
  const currentYear = new Date().getFullYear();
  
  for (let year = 0; year <= yearsToProject; year++) {
    projection.push({
      age: currentAge + year,
      year: currentYear + year,
      savings: Math.round(portfolio),
      fireTarget: Math.round(fireNumber),
      isFireReached: portfolio >= fireNumber,
    });
    
    portfolio = portfolio * (1 + realReturn) + annualContribution;
    
    // Stop projecting if way beyond FIRE
    if (portfolio > fireNumber * 3) break;
  }
  
  return projection;
}

/**
 * Calculate a single scenario
 */
function calculateScenario(
  inputs: FireInputs,
  returnAdjustment: number,
  inflationAdjustment: number
): FireScenario {
  const adjustedReturn = inputs.expectedAnnualReturn + returnAdjustment;
  const adjustedInflation = inputs.inflationRate + inflationAdjustment;
  
  const annualExpenses = inputs.monthlyExpenses * 12;
  const annualContribution = (inputs.monthlyIncome - inputs.monthlyExpenses) * 12;
  const fireNumber = inputs.customFireNumber && inputs.customFireNumber > 0
    ? inputs.customFireNumber
    : calculateFireNumber(annualExpenses, inputs.safeWithdrawalRate / 100);
  const realReturn = calculateRealReturn(adjustedReturn, adjustedInflation);
  
  const yearsToFire = calculateYearsToFire(
    inputs.currentSavings,
    annualContribution,
    fireNumber,
    realReturn
  );
  
  const yearsToRetirement = Math.max(0, inputs.targetRetirementAge - inputs.currentAge);
  const requiredMonthlySaving = calculateRequiredMonthlySaving(
    inputs.currentSavings,
    fireNumber,
    yearsToRetirement,
    realReturn
  );
  
  return {
    yearsToFire: Math.round(yearsToFire),
    fireAge: inputs.currentAge + Math.round(yearsToFire),
    fireNumber,
    requiredMonthlySaving: Math.round(requiredMonthlySaving),
  };
}

/**
 * Main calculation function - calculates all FIRE metrics
 */
export function calculateFire(inputs: FireInputs): FireOutputs {
  const {
    currentAge,
    currentSavings,
    monthlyExpenses,
    monthlyIncome,
    expectedAnnualReturn,
    inflationRate,
    safeWithdrawalRate,
  } = inputs;
  
  // Validate inputs
  if (monthlyIncome <= 0 || monthlyExpenses <= 0 || safeWithdrawalRate <= 0) {
    throw new Error('Invalid input: income, expenses, and SWR must be positive');
  }
  
  const annualExpenses = monthlyExpenses * 12;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const annualContribution = monthlySavings * 12;
  
  // Core calculations - use custom FIRE number if provided
  const fireNumber = inputs.customFireNumber && inputs.customFireNumber > 0
    ? inputs.customFireNumber
    : calculateFireNumber(annualExpenses, safeWithdrawalRate / 100);
  const realReturn = calculateRealReturn(expectedAnnualReturn, inflationRate);
  
  const yearsToFire = calculateYearsToFire(
    currentSavings,
    annualContribution,
    fireNumber,
    realReturn
  );
  
  const yearsToRetirement = Math.max(0, inputs.targetRetirementAge - currentAge);
  const requiredMonthlySaving = calculateRequiredMonthlySaving(
    currentSavings,
    fireNumber,
    yearsToRetirement,
    realReturn
  );
  
  // Derived metrics
  const currentProgress = Math.min(100, (currentSavings / fireNumber) * 100);
  const monthlyPassiveIncome = (currentSavings * (safeWithdrawalRate / 100)) / 12;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  
  // Generate projection
  const projectionData = generateProjection(inputs);
  
  // Calculate scenarios
  const scenarios: FireScenarios = {
    pessimistic: calculateScenario(inputs, -2, 1),
    realistic: calculateScenario(inputs, 0, 0),
    optimistic: calculateScenario(inputs, 2, -0.5),
  };
  
  return {
    fireNumber: Math.round(fireNumber),
    yearsToFire: Math.round(yearsToFire),
    fireAge: currentAge + Math.round(yearsToFire),
    requiredMonthlySaving: Math.round(requiredMonthlySaving),
    currentProgress,
    projectionData,
    scenarios,
    monthlyPassiveIncome: Math.round(monthlyPassiveIncome),
    savingsRate,
  };
}

/**
 * Format currency for display
 */
export function formatFireCurrency(value: number, currency: 'USD' | 'IDR' = 'USD'): string {
  if (currency === 'IDR') {
    if (value >= 1_000_000_000_000) {
      return `Rp${(value / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (value >= 1_000_000_000) {
      return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000_000) {
      return `Rp${(value / 1_000_000).toFixed(0)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  }
  
  // USD
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}
