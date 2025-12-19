/**
 * Keyboard Shortcuts for Nielsen Heuristic #7: Flexibility and efficiency of use
 * Provides shortcuts for power users while remaining invisible to novices
 */

import { useEffect, useCallback } from "react";
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

// Hook for registering keyboard shortcuts
type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
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
          // Don't trigger if user is typing in an input
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

// Global navigation shortcuts
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  
  const shortcuts: Shortcut[] = [
    {
      key: "d",
      meta: true,
      handler: () => navigate("/"),
      description: "Go to Dashboard",
    },
    {
      key: "p",
      meta: true,
      handler: () => navigate("/portfolio"),
      description: "Go to Portfolio",
    },
    {
      key: "t",
      meta: true,
      handler: () => navigate("/transactions"),
      description: "Go to Transactions",
    },
    {
      key: "a",
      meta: true,
      handler: () => navigate("/accounts"),
      description: "Go to Accounts",
    },
    {
      key: "k",
      meta: true,
      handler: () => {
        // Trigger global search
        const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: "Open Search",
    },
    {
      key: "?",
      shift: true,
      handler: () => {
        toast.info(
          <div className="space-y-2">
            <p className="font-semibold">Keyboard Shortcuts</p>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between"><span>Dashboard</span><Kbd keys={["⌘", "D"]} /></div>
              <div className="flex justify-between"><span>Portfolio</span><Kbd keys={["⌘", "P"]} /></div>
              <div className="flex justify-between"><span>Transactions</span><Kbd keys={["⌘", "T"]} /></div>
              <div className="flex justify-between"><span>Accounts</span><Kbd keys={["⌘", "A"]} /></div>
              <div className="flex justify-between"><span>Search</span><Kbd keys={["⌘", "K"]} /></div>
            </div>
          </div>,
          { duration: 5000 }
        );
      },
      description: "Show shortcuts",
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
