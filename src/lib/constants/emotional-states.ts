/**
 * Emotional States Configuration
 * Centralized definitions for emotional state tracking in trading
 */
import { 
  Smile, 
  Frown, 
  Meh,
  Zap,
  AlertTriangle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

// Emotional state definition
export interface EmotionalStateConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  description?: string;
}

// Available emotional states for trade logging
export const EMOTIONAL_STATES: EmotionalStateConfig[] = [
  { 
    id: 'calm', 
    label: 'Calm', 
    icon: Smile, 
    color: 'text-profit',
    description: 'Clear-headed, following your plan'
  },
  { 
    id: 'confident', 
    label: 'Confident', 
    icon: TrendingUp, 
    color: 'text-primary',
    description: 'Strong conviction in the setup'
  },
  { 
    id: 'anxious', 
    label: 'Anxious', 
    icon: Meh, 
    color: 'text-yellow-500',
    description: 'Worried about outcome'
  },
  { 
    id: 'fearful', 
    label: 'Fearful', 
    icon: Frown, 
    color: 'text-loss',
    description: 'Afraid of losing money'
  },
  { 
    id: 'fomo', 
    label: 'FOMO', 
    icon: Zap, 
    color: 'text-orange-500',
    description: 'Fear of missing out on profits'
  },
  { 
    id: 'revenge', 
    label: 'Revenge', 
    icon: AlertTriangle, 
    color: 'text-loss',
    description: 'Trying to recover losses quickly'
  },
] as const;

// Map of emotional state IDs to configs
export const EMOTIONAL_STATE_MAP = new Map<string, EmotionalStateConfig>(
  EMOTIONAL_STATES.map(state => [state.id, state])
);

/**
 * Get emotional state config by ID
 */
export function getEmotionalStateConfig(stateId: string): EmotionalStateConfig | undefined {
  return EMOTIONAL_STATE_MAP.get(stateId.toLowerCase());
}

/**
 * Get emotional state icon by ID
 */
export function getEmotionalStateIcon(stateId: string): LucideIcon {
  return getEmotionalStateConfig(stateId)?.icon || Meh;
}

/**
 * Get emotional state color by ID
 */
export function getEmotionalStateColor(stateId: string): string {
  return getEmotionalStateConfig(stateId)?.color || 'text-muted-foreground';
}

/**
 * Get all emotional state IDs
 */
export function getEmotionalStateIds(): string[] {
  return EMOTIONAL_STATES.map(s => s.id);
}
