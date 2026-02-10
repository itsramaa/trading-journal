/**
 * Analytics Level Selector
 * 
 * Allows switching between analytics scopes:
 * - Overall (Live) — default aggregate
 * - Per Account — filter to specific account
 * - Per Exchange — group by exchange
 * - By Type — Paper vs Live
 */
import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Layers, Building2, User, GitBranch } from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";

export type AnalyticsLevel = 'overall' | 'account' | 'exchange' | 'type';

export interface AnalyticsSelection {
  level: AnalyticsLevel;
  /** Account ID when level='account' */
  accountId?: string;
  /** Exchange name when level='exchange' */
  exchange?: string;
  /** 'paper' | 'live' when level='type' */
  tradeType?: 'paper' | 'live';
}

interface AnalyticsLevelSelectorProps {
  value: AnalyticsSelection;
  onChange: (selection: AnalyticsSelection) => void;
}

export function AnalyticsLevelSelector({ value, onChange }: AnalyticsLevelSelectorProps) {
  const { data: accounts = [] } = useAccounts();

  // Derive unique exchanges from accounts
  const exchanges = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach(a => {
      if (a.exchange) set.add(a.exchange);
    });
    return Array.from(set).sort();
  }, [accounts]);

  // Build a composite key for the Select value
  const compositeValue = useMemo(() => {
    switch (value.level) {
      case 'account': return `account:${value.accountId}`;
      case 'exchange': return `exchange:${value.exchange}`;
      case 'type': return `type:${value.tradeType}`;
      default: return 'overall';
    }
  }, [value]);

  const handleChange = (val: string) => {
    if (val === 'overall') {
      onChange({ level: 'overall' });
    } else if (val.startsWith('account:')) {
      onChange({ level: 'account', accountId: val.replace('account:', '') });
    } else if (val.startsWith('exchange:')) {
      onChange({ level: 'exchange', exchange: val.replace('exchange:', '') });
    } else if (val.startsWith('type:')) {
      onChange({ level: 'type', tradeType: val.replace('type:', '') as 'paper' | 'live' });
    }
  };

  // Display label
  const displayLabel = useMemo(() => {
    switch (value.level) {
      case 'account': {
        const acc = accounts.find(a => a.id === value.accountId);
        return acc ? `Account: ${acc.name}` : 'Per Account';
      }
      case 'exchange':
        return `Exchange: ${value.exchange}`;
      case 'type':
        return `Type: ${value.tradeType === 'paper' ? 'Paper' : 'Live'}`;
      default:
        return 'Overall (Live)';
    }
  }, [value, accounts]);

  return (
    <Select value={compositeValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Analytics Level">{displayLabel}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Scope</SelectLabel>
          <SelectItem value="overall">
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Overall (Live)
            </span>
          </SelectItem>
        </SelectGroup>

        <SelectSeparator />

        <SelectGroup>
          <SelectLabel>By Type</SelectLabel>
          <SelectItem value="type:live">
            <span className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5" /> Live
            </span>
          </SelectItem>
          <SelectItem value="type:paper">
            <span className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5" /> Paper
            </span>
          </SelectItem>
        </SelectGroup>

        {exchanges.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>By Exchange</SelectLabel>
              {exchanges.map(ex => (
                <SelectItem key={ex} value={`exchange:${ex}`}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> {ex}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        {accounts.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>By Account</SelectLabel>
              {accounts.map(acc => (
                  <SelectItem key={acc.id} value={`account:${acc.id}`}>
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> {acc.name}
                    </span>
                  </SelectItem>
                ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
