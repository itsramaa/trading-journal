/**
 * Keyboard Shortcuts for Nielsen Heuristic #7: Flexibility and efficiency of use
 * Uses G+key pattern (like GitHub) for navigation
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Keyboard shortcut display component
interface KbdProps {
  keys: string[];
  className?: string;
}

export function Kbd({ keys, className }: KbdProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

// Navigation shortcuts using G+key pattern
const NAVIGATION_SHORTCUTS: Record<string, { path: string; label: string; domain: string }> = {
  // Dashboard (standalone)
  'd': { path: '/', label: 'Dashboard', domain: '' },
  
  // Market domain
  'm': { path: '/market', label: 'Market Bias', domain: 'Market' },
  'c': { path: '/calendar', label: 'Economic Calendar', domain: 'Market' },
  'v': { path: '/market-data', label: 'Market Data', domain: 'Market' },
  'o': { path: '/top-movers', label: 'Top Movers', domain: 'Market' },
  
  // Journal domain  
  't': { path: '/trading', label: 'Trading Journal', domain: 'Journal' },
  'n': { path: '/import', label: 'Import & Sync', domain: 'Journal' },
  
  // Risk domain
  'r': { path: '/risk', label: 'Risk Overview', domain: 'Risk' },
  'x': { path: '/calculator', label: 'Position Calculator', domain: 'Risk' },
  
  // Strategy domain
  's': { path: '/strategies', label: 'My Strategies', domain: 'Strategy' },
  'b': { path: '/backtest', label: 'Backtest', domain: 'Strategy' },
  
  // Analytics domain
  'p': { path: '/performance', label: 'Performance', domain: 'Analytics' },
  'l': { path: '/daily-pnl', label: 'Daily P&L', domain: 'Analytics' },
  'e': { path: '/heatmap', label: 'Heatmap', domain: 'Analytics' },
  'i': { path: '/ai-insights', label: 'AI Insights', domain: 'Analytics' },
  
  // Accounts domain
  'a': { path: '/accounts', label: 'Accounts', domain: 'Accounts' },
  
  // Tools domain
  'w': { path: '/export', label: 'Bulk Export', domain: 'Tools' },
  
  // Settings domain
  ',': { path: '/settings', label: 'Settings', domain: 'Settings' },
};

/**
 * Hook for G+key navigation pattern
 * Press G, then within 1 second press a letter to navigate
 */
export function useNavigationShortcuts() {
  const navigate = useNavigate();
  const gPressedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // First press: G to activate
      if (key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressedRef.current = true;
        
        // Reset after 1 second
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 1000);
        return;
      }

      // Second press: navigate
      if (gPressedRef.current && NAVIGATION_SHORTCUTS[key]) {
        e.preventDefault();
        const { path, label } = NAVIGATION_SHORTCUTS[key];
        navigate(path);
        toast.success(`Navigated to ${label}`, { duration: 1500 });
        gPressedRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      // Show help with ?
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        showShortcutsHelp();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [navigate]);
}

function showShortcutsHelp() {
  const groupedShortcuts = Object.entries(NAVIGATION_SHORTCUTS).reduce((acc, [key, value]) => {
    const domain = value.domain || 'Main';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push({ key, ...value });
    return acc;
  }, {} as Record<string, Array<{ key: string; path: string; label: string }>>);

  toast.info(
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      <p className="font-semibold text-sm">Keyboard Shortcuts (G + key)</p>
      {Object.entries(groupedShortcuts).map(([domain, shortcuts]) => (
        <div key={domain} className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{domain}</p>
          <div className="grid gap-0.5 text-xs">
            {shortcuts.map(({ key, label }) => (
              <div key={key} className="flex justify-between items-center">
                <span>{label}</span>
                <Kbd keys={["G", key.toUpperCase()]} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1 border-t">Press ? to show this help</p>
    </div>,
    { duration: 8000 }
  );
}

// Legacy export for backward compatibility
export function useKeyboardShortcuts(shortcuts: Array<{
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
}>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          if (
            document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "TEXTAREA" ||
            (document.activeElement as HTMLElement)?.isContentEditable
          ) {
            continue;
          }
          
          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Deprecated - use useNavigationShortcuts instead
export function useGlobalShortcuts() {
  useNavigationShortcuts();
}
