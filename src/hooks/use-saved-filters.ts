/**
 * useSavedFilters - Manages filter presets in localStorage
 * Supports saving, loading, and deleting named filter configurations
 */
import { useState, useEffect, useCallback } from "react";

export interface FilterPreset {
  id: string;
  name: string;
  filters: {
    resultFilter: 'all' | 'profit' | 'loss' | 'breakeven';
    directionFilter: 'all' | 'LONG' | 'SHORT';
    selectedStrategyIds: string[];
    selectedPairs: string[];
    sortByAI: 'none' | 'asc' | 'desc';
    // Note: dateRange is not saved as it's typically time-sensitive
  };
  createdAt: string;
}

const STORAGE_KEY = 'trade-history-filter-presets';

export function useSavedFilters() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPresets(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
    }
    setIsLoaded(true);
  }, []);

  // Persist presets to localStorage
  const persistPresets = useCallback((newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }, []);

  // Save a new preset
  const savePreset = useCallback((
    name: string, 
    filters: FilterPreset['filters']
  ): FilterPreset => {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters,
      createdAt: new Date().toISOString(),
    };
    
    const newPresets = [...presets, newPreset];
    persistPresets(newPresets);
    return newPreset;
  }, [presets, persistPresets]);

  // Update an existing preset
  const updatePreset = useCallback((
    id: string, 
    updates: Partial<Pick<FilterPreset, 'name' | 'filters'>>
  ) => {
    const newPresets = presets.map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    persistPresets(newPresets);
  }, [presets, persistPresets]);

  // Delete a preset
  const deletePreset = useCallback((id: string) => {
    const newPresets = presets.filter(p => p.id !== id);
    persistPresets(newPresets);
  }, [presets, persistPresets]);

  // Get a preset by ID
  const getPreset = useCallback((id: string): FilterPreset | undefined => {
    return presets.find(p => p.id === id);
  }, [presets]);

  // Check if current filters match any saved preset
  const findMatchingPreset = useCallback((
    currentFilters: FilterPreset['filters']
  ): FilterPreset | undefined => {
    return presets.find(preset => {
      const p = preset.filters;
      const c = currentFilters;
      return (
        p.resultFilter === c.resultFilter &&
        p.directionFilter === c.directionFilter &&
        p.sortByAI === c.sortByAI &&
        JSON.stringify(p.selectedStrategyIds.sort()) === JSON.stringify(c.selectedStrategyIds.sort()) &&
        JSON.stringify(p.selectedPairs.sort()) === JSON.stringify(c.selectedPairs.sort())
      );
    });
  }, [presets]);

  return {
    presets,
    isLoaded,
    savePreset,
    updatePreset,
    deletePreset,
    getPreset,
    findMatchingPreset,
  };
}
