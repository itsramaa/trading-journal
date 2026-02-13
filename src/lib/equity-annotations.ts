/**
 * Equity Curve Annotation Detection
 * Detects streak zones, milestones, and drawdown periods from equity curve data.
 */

export interface CurveDataPoint {
  date: string;
  balance: number;
  drawdown: number;
  pnl: number;
}

export interface StreakZone {
  startIndex: number;
  endIndex: number;
  type: 'win' | 'loss';
  length: number;
  label: string;
}

export interface Milestone {
  index: number;
  type: 'ath' | 'max_dd' | 'breakeven';
  label: string;
  value: number;
}

const MIN_STREAK = 3;

/**
 * Detect winning and losing streak zones (>= 3 consecutive)
 */
export function detectStreakZones(data: CurveDataPoint[]): StreakZone[] {
  if (data.length < MIN_STREAK) return [];

  const zones: StreakZone[] = [];
  let streakStart = 0;
  let streakType: 'win' | 'loss' | null = data[0].pnl >= 0 ? 'win' : 'loss';
  let streakLen = 1;

  for (let i = 1; i < data.length; i++) {
    const currentType = data[i].pnl >= 0 ? 'win' : 'loss';
    if (currentType === streakType) {
      streakLen++;
    } else {
      if (streakLen >= MIN_STREAK && streakType) {
        zones.push({
          startIndex: streakStart,
          endIndex: i - 1,
          type: streakType,
          length: streakLen,
          label: `${streakLen}-${streakType === 'win' ? 'win' : 'loss'} streak`,
        });
      }
      streakStart = i;
      streakType = currentType;
      streakLen = 1;
    }
  }

  // Final streak
  if (streakLen >= MIN_STREAK && streakType) {
    zones.push({
      startIndex: streakStart,
      endIndex: data.length - 1,
      type: streakType,
      length: streakLen,
      label: `${streakLen}-${streakType === 'win' ? 'win' : 'loss'} streak`,
    });
  }

  return zones;
}

/**
 * Detect milestones: ATH, max drawdown point, break-even recovery points
 */
export function detectMilestones(data: CurveDataPoint[], initialBalance: number): Milestone[] {
  if (data.length === 0) return [];

  const milestones: Milestone[] = [];
  let peak = initialBalance;
  let maxDd = 0;
  let maxDdIndex = -1;
  let athIndex = -1;
  let belowInitial = false;

  for (let i = 0; i < data.length; i++) {
    const { balance } = data[i];

    // ATH detection
    if (balance > peak) {
      peak = balance;
      athIndex = i;
    }

    // Max drawdown point
    const dd = peak - balance;
    if (dd > maxDd) {
      maxDd = dd;
      maxDdIndex = i;
    }

    // Break-even recovery
    if (belowInitial && balance >= initialBalance) {
      milestones.push({
        index: i,
        type: 'breakeven',
        label: 'Break-even',
        value: balance,
      });
      belowInitial = false;
    }
    if (balance < initialBalance) {
      belowInitial = true;
    }
  }

  // Add ATH
  if (athIndex >= 0) {
    milestones.push({
      index: athIndex,
      type: 'ath',
      label: 'ATH',
      value: data[athIndex].balance,
    });
  }

  // Add max drawdown
  if (maxDdIndex >= 0 && maxDd > 0) {
    const ddPercent = peak > 0 ? (maxDd / peak) * 100 : 0;
    milestones.push({
      index: maxDdIndex,
      type: 'max_dd',
      label: `Max DD -${ddPercent.toFixed(1)}%`,
      value: data[maxDdIndex].balance,
    });
  }

  return milestones;
}
