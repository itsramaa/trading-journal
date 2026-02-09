

# Plan: Enhanced Debug UI untuk YouTube Strategy Import

## Masalah yang Ditemukan

Dari logs edge function:
```
[Transcript] Gemini grounding SUCCESS
[Transcript] Final source: gemini, words: 356
```

Transcript **berhasil diambil** (356 words), tapi methodology detection menghasilkan **confidence 0%**. Kemungkinan:
1. Gemini Grounding tidak mengembalikan transcript asli, tapi summary/analisis
2. Transcript terlalu pendek atau tidak mengandung trading terminology
3. AI gagal parse JSON response

## Solusi: Tampilkan Debug Info Lengkap

### 1. Update Edge Function Response

Tambah field `debug` di response untuk transparansi:

```typescript
{
  status: "blocked" | "success" | ...,
  reason: "...",
  strategy: {...},
  validation: {...},
  // NEW
  debug: {
    transcriptSource: "gemini" | "youtube_captions" | "manual",
    transcriptLength: 356,
    transcriptPreview: "First 500 chars of transcript...",
    methodologyRaw: {
      methodology: "unknown",
      confidence: 0,
      evidence: [],
      reasoning: "No trading-specific terminology found"
    },
    processingSteps: [
      { step: "transcript_acquisition", status: "success", details: "Gemini grounding" },
      { step: "quality_check", status: "success", details: "Has actionable content" },
      { step: "methodology_detection", status: "failed", details: "Confidence 0%" }
    ]
  }
}
```

### 2. Update Frontend Types

Tambah `YouTubeImportDebugInfo` interface di `src/types/backtest.ts`:

```typescript
export interface YouTubeImportDebugStep {
  step: string;
  status: 'success' | 'warning' | 'failed' | 'skipped';
  details: string;
}

export interface YouTubeImportDebugInfo {
  transcriptSource: 'gemini' | 'youtube_captions' | 'manual';
  transcriptLength: number;
  transcriptPreview: string;
  methodologyRaw?: {
    methodology: string;
    confidence: number;
    evidence: string[];
    reasoning?: string;
  };
  processingSteps: YouTubeImportDebugStep[];
}
```

### 3. Update Frontend Component

Tambah expandable "Debug Info" section di `YouTubeStrategyImporter.tsx`:

- Tampilkan **Processing Steps** sebagai timeline
- Tampilkan **Transcript Preview** (first 500 chars)
- Tampilkan **Methodology Detection Raw Result**
- Gunakan Collapsible/Accordion untuk tidak mengganggu UX normal

```text
┌──────────────────────────────────────────┐
│ ⚠️ Strategy blocked (0% confidence)       │
│                                          │
│ [▼ Show Debug Info]                      │
│ ┌────────────────────────────────────┐   │
│ │ Processing Steps:                   │   │
│ │ ✓ Transcript: gemini (356 words)   │   │
│ │ ✓ Quality Check: passed            │   │
│ │ ✗ Methodology: 0% confidence       │   │
│ │                                    │   │
│ │ Transcript Preview:                │   │
│ │ "Video ini membahas tentang..."    │   │
│ │                                    │   │
│ │ Methodology Detection Result:      │   │
│ │ { evidence: [], reasoning: "..." } │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### 4. Update Hook

Update `use-youtube-strategy-import.ts` untuk menyimpan debug info dari response.

---

## Technical Implementation

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/youtube-strategy-import/index.ts` | Tambah `debug` field di response |
| `src/types/backtest.ts` | Tambah `YouTubeImportDebugInfo` interface |
| `src/hooks/use-youtube-strategy-import.ts` | Handle debug info dari response |
| `src/components/strategy/YouTubeStrategyImporter.tsx` | Render debug info UI |

### Edge Function Changes

1. Capture transcript preview (first 500 chars)
2. Capture raw methodology detection result (termasuk saat confidence rendah)
3. Track each processing step dengan status
4. **Selalu return debug info** (baik success maupun blocked/failed)

### UI Changes

1. Tambah `Collapsible` component untuk debug section
2. Tampilkan transcript preview dalam `<pre>` atau code block
3. Tampilkan methodology result sebagai JSON
4. Gunakan color-coded badges untuk step status

---

## Benefit

1. **Transparansi**: User bisa lihat exactly what happened
2. **Debugging**: Mudah identify kenapa extraction gagal
3. **Trust**: User paham bahwa sistem tidak arbitrary
4. **Improvement**: Data untuk improve prompt/logic ke depan

