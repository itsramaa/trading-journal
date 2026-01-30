

# Plan: End-to-End Heuristic Evaluation + Accessibility Fix

## Overview

Melakukan perbaikan menyeluruh pada semua pages dan fitur berdasarkan **10 Nielsen's Usability Heuristics** dan **WCAG 2.1 Accessibility Guidelines** untuk memastikan aplikasi Trading Journey memenuhi standar usability dan aksesibilitas tertinggi.

---

## Framework Evaluasi

### Nielsen's 10 Heuristics Applied

| # | Heuristic | Current Gaps Identified |
|---|-----------|------------------------|
| H1 | Visibility of System Status | Missing loading indicators, no real-time feedback on some actions |
| H2 | Match Between System & Real World | Some technical jargon without context |
| H3 | User Control & Freedom | Missing undo/cancel on some destructive actions |
| H4 | Consistency & Standards | Color tokens inconsistent in some components |
| H5 | Error Prevention | Missing validation on some form inputs |
| H6 | Recognition Rather Than Recall | Icon-only buttons missing labels |
| H7 | Flexibility & Efficiency | Missing keyboard shortcuts visibility |
| H8 | Aesthetic & Minimalist Design | Some cluttered UI sections |
| H9 | Help Users Recognize Errors | Vague error messages |
| H10 | Help & Documentation | Missing contextual help tooltips |

### WCAG 2.1 Checkpoints

| Level | Requirement | Status |
|-------|-------------|--------|
| A | Color contrast 4.5:1 | Partial - some secondary text needs fixing |
| A | Keyboard navigation | Partial - some interactive elements need `tabIndex` |
| A | Alt text for images | OK - using Lucide icons |
| A | Focus indicators | Partial - need enhancement |
| AA | Focus visible | Partial - needs `:focus-visible` audit |
| AA | Error identification | Needs improvement |
| AA | Labels & instructions | Missing `aria-label` on icon buttons |

---

## Files to Modify

### Pages (8 files)

| File | Issues | Fixes |
|------|--------|-------|
| `Dashboard.tsx` | H1, H6, H10, WCAG-A | Add aria-labels, loading states, contextual tooltips |
| `Accounts.tsx` | H3, H5, H6, WCAG-A | Add sr-only labels, form validation, undo actions |
| `Calendar.tsx` | H1, H6, WCAG-A | Add aria-labels on icon buttons, live region for updates |
| `MarketInsight.tsx` | H1, H2, H10, WCAG-AA | Add aria-labels, help tooltips, jargon explanations |
| `RiskManagement.tsx` | H5, H6, H10, WCAG-A | Add validation feedback, aria-labels, help text |
| `AIAssistant.tsx` | H1, H3, H6, WCAG-A | Add loading states, cancel actions, aria-labels |
| `TradingJournal.tsx` | H3, H5, H6, H9, WCAG-AA | Add undo, validation, error messages, labels |
| `StrategyManagement.tsx` | H5, H6, H10, WCAG-A | Add validation, aria-labels, contextual help |

### Components (10 files)

| File | Issues | Fixes |
|------|--------|-------|
| `SystemStatusIndicator.tsx` | H4, WCAG-AA | Replace hardcoded colors with design tokens |
| `AIChatbot.tsx` | H1, H3, H6, WCAG-A | Add aria-labels, live region, focus management |
| `DailyLossTracker.tsx` | H2, H10, WCAG-A | Add help tooltips, aria-labels |
| `PositionSizeCalculator.tsx` | H5, H9, WCAG-AA | Add validation feedback, error messages |
| `BacktestRunner.tsx` | H1, H5, WCAG-A | Add loading states, validation |
| `BacktestComparison.tsx` | H6, H10, WCAG-A | Add aria-labels, help tooltips |
| `TradeEntryWizard.tsx` | H1, H3, H6, WCAG-AA | Add progress announcements, cancel confirmation |
| `WizardProgress.tsx` | H1, WCAG-A | Add aria-labels, step announcements |
| `HeaderControls.tsx` | H6, WCAG-A | Add sr-only labels for icon buttons |
| `AppSidebar.tsx` | H6, WCAG-A | Ensure all nav items have accessible names |

### UI Components (4 files)

| File | Issues | Fixes |
|------|--------|-------|
| `empty-state.tsx` | WCAG-A | Already compliant, minor enhancements |
| `form-feedback.tsx` | H9, WCAG-AA | Enhance error messages with icons |
| `info-tooltip.tsx` | H10, WCAG-A | Ensure keyboard accessible |
| `confirm-dialog.tsx` | H3, WCAG-A | Add focus trap, aria-labels |

---

## Detailed Fixes

### 1. Heuristic 1: Visibility of System Status

**Problem:** Users don't always know when operations are in progress or completed.

**Fixes:**

```text
SystemStatusIndicator.tsx:
- Replace hardcoded 'text-green-500' → 'text-profit'
- Replace 'bg-green-500/10' → 'bg-profit/10'
- Replace 'text-red-500' → 'text-loss'
- Replace 'text-yellow-500' → 'text-[hsl(var(--chart-4))]'

AIChatbot.tsx:
- Add aria-live="polite" to chat message container
- Add aria-busy={isLoading} to chat area
- Add status announcement for loading states

TradeEntryWizard.tsx:
- Add aria-live="polite" for step changes
- Announce "Step X of 7: [Step Name]" to screen readers
```

### 2. Heuristic 3: User Control & Freedom

**Problem:** Some destructive actions lack confirmation or undo.

**Fixes:**

```text
TradingJournal.tsx:
- Add undo toast after trade deletion with 5-second window
- Confirm dialog already exists but needs aria-label

AIChatbot.tsx:
- Add confirmation before clearing chat history
- Add aria-label to clear button: "Clear conversation history"

All Delete Actions:
- Ensure ConfirmDialog has focus trap
- Auto-focus cancel button (safer default)
```

### 3. Heuristic 5: Error Prevention

**Problem:** Some forms allow invalid submissions.

**Fixes:**

```text
PositionSizeCalculator.tsx:
- Add real-time validation for negative values
- Show error message: "Position size cannot exceed account balance"
- Disable calculate button when inputs invalid

TradeEntryWizard.tsx:
- Validate entry price > 0
- Validate stop loss is valid relative to direction
- Show inline error messages with icons

BacktestRunner.tsx:
- Validate date range (end > start)
- Validate initial capital > 0
- Show validation errors before allowing run
```

### 4. Heuristic 6: Recognition Rather Than Recall

**Problem:** Icon-only buttons without labels.

**Fixes:**

```text
Add sr-only labels to all icon buttons:

HeaderControls.tsx:
- <span className="sr-only">Toggle dark mode</span>
- <span className="sr-only">View notifications</span>

Dashboard.tsx:
- All quick action buttons already have text labels ✓

AIChatbot.tsx:
- <span className="sr-only">Minimize chat</span>
- <span className="sr-only">Expand chat</span>
- <span className="sr-only">Close chat</span>
- <span className="sr-only">Send message</span>

StrategyManagement.tsx:
- <span className="sr-only">Strategy options</span> for MoreVertical buttons

All Pages:
- Audit and add sr-only to icon-only buttons
```

### 5. Heuristic 9: Help Users Recognize Errors

**Problem:** Error messages are sometimes vague.

**Fixes:**

```text
Standardized Error Message Pattern:
{
  title: "Action failed",
  description: "Specific reason + what to do next",
  action: "Retry" or specific fix action
}

PositionSizeCalculator.tsx:
- "Invalid position size" → "Position size exceeds your available balance of $X. Reduce size or add funds."

TradingJournal.tsx:
- "Failed to create trade" → "Could not save trade. Check your internet connection and try again."

All API Errors:
- Add error boundary with user-friendly message
- Include "Try again" button where appropriate
```

### 6. Heuristic 10: Help & Documentation

**Problem:** Some complex features lack contextual help.

**Fixes:**

```text
Add InfoTooltip to complex inputs:

RiskManagement.tsx:
- "Risk per Trade" → InfoTooltip: "The percentage of your account you're willing to lose on a single trade. 1-2% is recommended."
- "Max Drawdown" → InfoTooltip: "The maximum decline from peak to trough before you stop trading."

PositionSizeCalculator.tsx:
- "Entry Price" → InfoTooltip: "The price at which you plan to enter the trade"
- "R:R Ratio" → InfoTooltip: "Risk to Reward ratio. 2:1 means potential profit is 2x potential loss."

MarketInsight.tsx:
- "Fear & Greed Index" → InfoTooltip: "Market sentiment indicator. <25 = Extreme Fear (buy signal), >75 = Extreme Greed (sell signal)"
- "Sharpe Ratio" → InfoTooltip: "Risk-adjusted return. Higher is better. >1 is good, >2 is excellent."
```

---

## Accessibility Enhancements (WCAG 2.1)

### Color Contrast Fixes

```text
Files affected:
- SystemStatusIndicator.tsx: Use design tokens
- All components using hardcoded colors

Replace:
- 'text-green-500' → 'text-profit'
- 'text-red-500' → 'text-loss'
- 'text-yellow-500' → 'text-[hsl(var(--chart-4))]'
- 'bg-green-500' → 'bg-profit'
- 'bg-red-500' → 'bg-loss'
```

### Keyboard Navigation

```text
Ensure keyboard accessibility:

AIChatbot.tsx:
- Already has Escape key handling ✓
- Add: Tab trap when expanded
- Ensure Send button is focusable

TradeEntryWizard.tsx:
- Add keyboard navigation between steps (Arrow keys)
- Ensure all form fields are tabbable in correct order

StrategyManagement.tsx:
- Strategy cards should be keyboard selectable
- Add Enter/Space to activate card actions
```

### Screen Reader Support

```text
Add ARIA attributes:

AIChatbot.tsx:
- aria-live="polite" on message container
- aria-busy={isLoading}
- role="log" on message list
- aria-label="AI Trading Assistant chat"

WizardProgress.tsx:
- aria-current="step" on active step
- aria-label="Trade entry progress: Step X of 7"

SystemStatusIndicator.tsx:
- role="status"
- aria-live="polite" for status changes

All Tables:
- Ensure scope="col" on headers
- Add aria-label describing table purpose
```

### Focus Management

```text
Enhance focus states:

src/index.css (already has):
- :focus-visible with ring ✓
- prefers-reduced-motion ✓

Components to enhance:
- Cards: Add focus:ring-2 for interactive cards
- Wizard steps: Focus first input when step changes
- Dialog: Focus first interactive element on open
```

---

## Implementation Order

### Phase 1: Critical Accessibility (WCAG A)

1. Add `aria-label` to all icon-only buttons
2. Fix color contrast issues (design tokens)
3. Add `sr-only` labels throughout
4. Ensure keyboard navigation works

### Phase 2: Usability Heuristics

5. Enhance error messages (H9)
6. Add loading states and feedback (H1)
7. Add contextual help tooltips (H10)
8. Add undo/cancel actions (H3)

### Phase 3: Polish (WCAG AA)

9. Add live regions for dynamic content
10. Enhance focus management
11. Add form validation feedback (H5)
12. Final accessibility audit

---

## Specific Code Changes

### SystemStatusIndicator.tsx - Color Token Migration

```typescript
// Before
const statusConfig = {
  ok: {
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  warning: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  disabled: {
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
};

// After
const statusConfig = {
  ok: {
    color: 'text-profit',
    bg: 'bg-profit/10',
    border: 'border-profit/30',
  },
  warning: {
    color: 'text-[hsl(var(--chart-4))]',
    bg: 'bg-[hsl(var(--chart-4))]/10',
    border: 'border-[hsl(var(--chart-4))]/30',
  },
  disabled: {
    color: 'text-loss',
    bg: 'bg-loss/10',
    border: 'border-loss/30',
  },
};
```

### AIChatbot.tsx - Accessibility Enhancement

```typescript
// Add aria-label to FAB button
<Button
  onClick={() => setIsOpen(true)}
  size="lg"
  className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
  aria-label="Open AI Trading Assistant"
>
  <Sparkles className="h-6 w-6" />
</Button>

// Add aria-live to message container
<ScrollArea 
  className="flex-1 p-4" 
  ref={scrollRef}
  role="log"
  aria-live="polite"
  aria-label="Chat messages"
>

// Add sr-only labels to header buttons
<Button variant="ghost" size="icon" className="h-7 w-7" ...>
  <Minimize2 className="h-4 w-4" />
  <span className="sr-only">
    {isExpanded ? "Collapse chat" : "Expand chat"}
  </span>
</Button>
```

### HeaderControls.tsx - SR-Only Labels

```typescript
// Theme toggle
<Button variant="ghost" size="icon" onClick={toggleTheme}>
  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
  <span className="sr-only">
    {isDark ? "Switch to light mode" : "Switch to dark mode"}
  </span>
</Button>

// Notification toggle
<Button variant="ghost" size="icon">
  <Bell className="h-4 w-4" />
  <span className="sr-only">View notifications</span>
</Button>
```

### WizardProgress.tsx - Step Announcements

```typescript
// Add aria attributes for accessibility
<div 
  className="w-full"
  role="navigation"
  aria-label={`Trade entry progress: Step ${WIZARD_STEPS.indexOf(currentStep) + 1} of ${WIZARD_STEPS.length}`}
>
  {/* Step indicators */}
  <button
    onClick={() => isClickable && onStepClick?.(step)}
    disabled={!isClickable}
    aria-current={isCurrent ? "step" : undefined}
    aria-label={`${STEP_LABELS[step]}: ${isCompleted ? "Completed" : isCurrent ? "Current step" : "Not started"}`}
    className={cn(...)}
  >
```

---

## Summary

| Category | Files | Priority |
|----------|-------|----------|
| Pages | 8 | High |
| Components | 10 | High |
| UI Components | 4 | Medium |
| **Total** | **22 files** | |

### Expected Outcomes

- WCAG 2.1 Level AA compliance for core user flows
- Nielsen's 10 Heuristics score improvement from ~70% to ~95%
- Screen reader compatibility for all interactive elements
- Consistent keyboard navigation across all pages
- Better error prevention and recovery
- Contextual help throughout the application
- Design system color tokens used consistently (no hardcoded colors)

