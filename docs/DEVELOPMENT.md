# Development Guidelines

## Code Conventions

### Component Structure
```typescript
// 1. Imports
import { useState } from 'react';
import { Card } from '@/components/ui/card';

// 2. Types
interface Props {
  value: number;
}

// 3. Component
export function MyComponent({ value }: Props) {
  // hooks first
  const [state, setState] = useState(false);
  
  // handlers
  const handleClick = () => {};
  
  // render
  return <Card>...</Card>;
}
```

### Hook Patterns
```typescript
// Query hook
export function useSomething() {
  return useQuery({
    queryKey: ['something'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table')
        .select('*');
      if (error) throw error;
      return data;
    }
  });
}

// Mutation hook
export function useCreateSomething() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('table')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['something'] });
    }
  });
}
```

## File Naming

- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Types: `kebab-case.ts`
- Utils: `kebab-case.ts`

## Styling

Use design system tokens only:
```tsx
// ✅ Correct
<div className="bg-background text-foreground border-border">

// ❌ Wrong
<div className="bg-white text-black border-gray-200">
```

## Testing

Tests located in `src/test/`:
- `contracts/` - API contract tests
- `integration/` - Integration tests
- `e2e/` - End-to-end tests
- `state/` - State management tests

Run tests:
```bash
npm run test
```

## Edge Functions

Located in `supabase/functions/`:
- Use Deno runtime
- Auto-deployed on push
- Access secrets via `Deno.env.get()`
