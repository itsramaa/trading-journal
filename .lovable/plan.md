
# Plan: AI Prompt Overhaul — Enhanced Classification & Extraction

## Overview

Update `supabase/functions/youtube-strategy-import/prompts.ts` dengan prompt yang lebih komprehensif untuk meningkatkan akurasi deteksi metodologi dan ekstraksi strategi.

---

## Changes Summary

### File: `supabase/functions/youtube-strategy-import/prompts.ts`

#### 1. METHODOLOGY_DETECTION_PROMPT (Enhanced)

**Improvements:**
- Classification Framework yang lebih detail untuk setiap metodologi
- Keyword & characteristics spesifik untuk setiap kategori
- Decision Logic yang jelas (scan → count → analyze → hybrid check)
- Confidence Scoring guidelines (90-100, 70-89, 50-69, below 50)
- Edge Cases handling (structure alone, fibonacci without waves, dll)
- Added `reasoning` field untuk transparansi keputusan AI

**New Fields in Output:**
```json
{
  "methodology": "...",
  "confidence": 85,
  "evidence": ["quote1", "quote2", "quote3"],
  "reasoning": "Brief explanation of why this methodology was chosen"
}
```

#### 2. STRATEGY_EXTRACTION_PROMPT (Enhanced)

**Improvements:**
- Core Principles yang eksplisit (Literal Transcription, No Inference, No Defaults)
- Type definitions yang lebih lengkap (`time`, `confluence` ditambahkan)
- Structured Entry Rules dengan `sourceQuote` untuk evidence
- Exit Rules structure dengan parameter spesifik
- Risk Management extraction yang lebih detail
- `extractionConfidence` breakdown (overall, entryClarity, exitClarity, riskClarity)
- `notes` field untuk mencatat ambiguitas
- Quality Checklist sebagai guard rail

**New Entry Rule Types:**
- `smc` | `ict` | `indicator` | `price_action` | `liquidity` | `structure` | `time` | `confluence`

**New Output Structure:**
```json
{
  "metadata": {
    "methodology": "...",
    "timeframes": [],
    "instruments": [],
    "sessionPreference": null
  },
  "conceptsUsed": [],
  "indicatorsUsed": [],
  "entryRules": [
    {
      "type": "...",
      "concept": "...",
      "condition": "...",
      "parameters": {},
      "sourceQuote": "..."
    }
  ],
  "exitRules": [],
  "riskManagement": {
    "stopLoss": null,
    "positionSizing": null,
    "riskRewardRatio": null
  },
  "additionalFilters": [],
  "notes": [],
  "extractionConfidence": {
    "overall": 0,
    "entryClarity": 0,
    "exitClarity": 0,
    "riskClarity": 0
  }
}
```

---

## Technical Details

### Updated Helper Functions

**`buildMethodologyPrompt`** — No changes needed, already includes transcript

**`buildExtractionPrompt`** — Will be updated to pass methodology context properly

---

## Implementation

### Step 1: Replace METHODOLOGY_DETECTION_PROMPT

Update dengan versi yang mencakup:
- 7 kategori metodologi dengan detail
- Decision logic 4-step
- Confidence scoring guidelines
- Edge cases documentation

### Step 2: Replace STRATEGY_EXTRACTION_PROMPT

Update dengan versi yang mencakup:
- Core principles (no hallucination)
- Enhanced entry/exit rule structure
- Risk management extraction
- Extraction confidence breakdown
- Quality checklist

### Step 3: Update index.ts (Minor)

Sesuaikan parsing response AI karena struktur output berubah:
- Handle new `reasoning` field dari methodology detection
- Handle new `extractionConfidence` object dari strategy extraction
- Map `sourceQuote` ke existing rule structure jika diperlukan

---

## Impact Analysis

| Component | Impact |
|-----------|--------|
| `prompts.ts` | Full rewrite of both prompts |
| `index.ts` | Minor updates for new response fields |
| `validation.ts` | No changes needed |
| Frontend | No changes needed (backward compatible) |

---

## Backward Compatibility

Response structure tetap kompatibel karena:
- Core fields (`methodology`, `confidence`, `evidence`) masih ada
- Entry/exit rules masih mengikuti struktur dasar yang sama
- New fields (`reasoning`, `sourceQuote`, `extractionConfidence`) bersifat additive

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `supabase/functions/youtube-strategy-import/prompts.ts` | Full rewrite of prompts |
| `supabase/functions/youtube-strategy-import/index.ts` | Minor parsing updates |
