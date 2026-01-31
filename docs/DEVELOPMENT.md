# Development Guidelines

## Code Conventions

### Component Structure

```typescript
// 1. Imports (external → internal → types → styles)
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import type { TradeEntry } from '@/types/trade';

// 2. Types & Interfaces
interface Props {
  tradeId: string;
  onClose: () => void;
}

// 3. Component
export function TradeCard({ tradeId, onClose }: Props) {
  // 3a. Hooks first
  const { data: trade } = useTradeEntries();
  const [isEditing, setIsEditing] = useState(false);
  
  // 3b. Derived state
  const isProfit = trade?.pnl > 0;
  
  // 3c. Handlers
  const handleSave = useCallback(() => {
    // ...
  }, []);
  
  // 3d. Render
  return (
    <Card>
      {/* ... */}
    </Card>
  );
}
```

### Hook Patterns

**Query Hook:**
```typescript
export function useTradeEntries() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['trade-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_entries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
```

**Mutation Hook:**
```typescript
export function useCreateTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (input: CreateTradeInput) => {
      const { data, error } = await supabase
        .from('trade_entries')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
      toast({
        title: "Trade created",
        description: "Your trade has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `TradeCard.tsx` |
| Hooks | use-kebab-case.ts | `use-trade-entries.ts` |
| Types | kebab-case.ts | `trade-wizard.ts` |
| Utils | kebab-case.ts | `trading-calculations.ts` |
| Pages | PascalCase.tsx | `Dashboard.tsx` |
| Contexts | PascalCase.tsx | `MarketContext.tsx` |

## Styling Guidelines

**DO use design tokens:**
```tsx
// ✅ Correct - semantic tokens
<div className="bg-background text-foreground border-border">
<Badge variant="destructive">Loss</Badge>
<Card className="bg-card">
```

**DON'T use direct colors:**
```tsx
// ❌ Wrong - direct colors
<div className="bg-white text-black border-gray-200">
<div className="bg-red-500">
```

**Design Token Categories:**
- `background`, `foreground` - Base colors
- `card`, `card-foreground` - Card styling
- `primary`, `secondary`, `accent` - Action colors
- `destructive`, `warning` - Status colors
- `muted`, `muted-foreground` - Subdued elements
- `border`, `input`, `ring` - Form elements

## Query Key Conventions

```typescript
// Pattern: [domain, ...identifiers]
['accounts']
['accounts', accountId]
['trade-entries', userId]
['trade-entries', userId, { status: 'open' }]
['trading-strategies', userId]
['binance', 'balance']
['binance', 'positions']
['binance', 'positions', symbol]
['binance', 'income', { days: 7 }]
['risk-profile', userId]
['market-sentiment']
```

## Testing Structure

```
src/test/
├── contracts/       # API contract tests
│   ├── ai-endpoints.contract.test.ts
│   ├── binance-api.contract.test.ts
│   └── supabase-tables.contract.test.ts
│
├── integration/     # Integration tests
│   ├── auth-flow.integration.test.tsx
│   ├── binance-sync.integration.test.tsx
│   └── trade-entry.integration.test.tsx
│
├── e2e/             # End-to-end tests
│   ├── auth.e2e.test.tsx
│   └── trade-entry.e2e.test.tsx
│
├── state/           # State management tests
│   ├── app-store.state.test.ts
│   └── query-cache.state.test.ts
│
├── observability/   # Monitoring tests
│   ├── analytics-events.test.ts
│   └── error-boundaries.test.tsx
│
├── mocks/           # Mock data & handlers
│   ├── handlers.ts
│   ├── supabase.ts
│   └── binance.ts
│
├── setup.ts         # Test setup
└── utils.tsx        # Test utilities
```

**Run tests:**
```bash
npm run test
```

## Edge Function Pattern

```typescript
// supabase/functions/my-function/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, ...',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { action, ...params } = await req.json();
    
    // Auth check (if needed)
    const authHeader = req.headers.get('Authorization');
    
    // Process action
    let result;
    switch (action) {
      case 'get-data':
        result = await getData(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Return success
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    // Return error
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

## Common Pitfalls

### ❌ Don't

1. **Direct Supabase calls in components**
   ```tsx
   // Bad
   function MyComponent() {
     useEffect(() => {
       supabase.from('table').select();
     }, []);
   }
   ```

2. **Inline styles instead of Tailwind**
   ```tsx
   // Bad
   <div style={{ color: 'red' }}>
   ```

3. **Large monolithic components**
   - Keep components < 200 lines
   - Extract sub-components

4. **Missing error handling**
   ```tsx
   // Bad
   const { data } = await supabase.from('table').select();
   // Good
   const { data, error } = await supabase.from('table').select();
   if (error) throw error;
   ```

### ✅ Do

1. **Use custom hooks for data fetching**
2. **Use design system tokens**
3. **Handle loading and error states**
4. **Keep components focused (SRP)**
5. **Use TypeScript strictly**

## Adding New Features

1. **Plan**: Update `.lovable/plan.md` if significant
2. **Types**: Define types in `src/types/`
3. **Hook**: Create hook in `src/hooks/` or `src/features/`
4. **Component**: Build in appropriate `src/components/` folder
5. **Page**: Add route in `App.tsx` if needed
6. **Test**: Add tests in `src/test/`
7. **Document**: Update relevant docs
