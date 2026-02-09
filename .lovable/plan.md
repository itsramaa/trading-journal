

# Plan: Unified Gemini YouTube Strategy Extraction

## Problem Analysis

Dari hasil testing sebelumnya:
1. **Gemini Grounding** memberikan **summary/analysis** bukan raw transcript
2. **Pipeline 3-step saat ini**:
   - Step 1: Transcript acquisition → Gemini kadang return konten tidak relevan
   - Step 2: Methodology detection → Gagal karena input bukan trading content
   - Step 3: Strategy extraction → Tidak dijalankan karena Step 2 gagal

## Solution: Single-Pass Unified Extraction

Gabungkan semua step dalam **satu prompt** yang komprehensif. Jika Gemini bisa mengakses konten YouTube, ia akan langsung extract strategy. Jika tidak, kita fallback ke manual transcript.

### New Flow Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    YouTube URL Input                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Option A: Unified Gemini Extraction (NEW)                    │
│ - Single prompt dengan enhanced prompts                      │
│ - Langsung methodology + entry/exit + risk management        │
│ - Return structured JSON                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
         ┌──────────────┐         ┌──────────────┐
         │   SUCCESS    │         │    FAILED    │
         │ JSON dengan  │         │ GROUNDING_   │
         │ strategy     │         │ UNAVAILABLE  │
         └──────────────┘         └──────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │ Fallback: YouTube API   │
                              │ atau Manual Transcript  │
                              └─────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │ Traditional 2-step:     │
                              │ 1. Methodology detect   │
                              │ 2. Strategy extract     │
                              └─────────────────────────┘
```

---

## Implementation Details

### 1. Create New Unified Prompt (`gemini-unified-extract.ts`)

Buat file baru yang menggabungkan:
- Methodology detection logic dari `prompts.ts`
- Strategy extraction logic dari `prompts.ts`
- Transcription request jika URL provided

**Unified Prompt Structure:**
```typescript
const UNIFIED_YOUTUBE_EXTRACTION_PROMPT = `
You are an expert trading strategy analyst with access to YouTube content.

## TASK
Analyze this YouTube video and extract the complete trading strategy.

YouTube URL: {url}

## STEP 1: ACCESS VIDEO CONTENT
Access the video content and identify all spoken trading-related information.
If you cannot access the video, respond with exactly: {"error": "CANNOT_ACCESS_VIDEO"}

## STEP 2: METHODOLOGY CLASSIFICATION
[Include full METHODOLOGY_DETECTION_PROMPT content here]

## STEP 3: STRATEGY EXTRACTION  
[Include full STRATEGY_EXTRACTION_PROMPT content here]

## OUTPUT FORMAT
Return a single JSON object:
{
  "canAccessVideo": true,
  "transcriptPreview": "<first 500 chars of what you heard>",
  "methodology": {...},
  "strategy": {...}
}
`;
```

### 2. Update Edge Function (`index.ts`)

Modify flow:
1. **If URL provided** → Try unified extraction first
2. **If unified fails** → Fallback to YouTube caption API + traditional 2-step
3. **If manual transcript** → Use traditional 2-step (no change)

```typescript
// New function signature
async function unifiedGeminiExtraction(
  youtubeUrl: string,
  videoId: string,
  apiKey: string
): Promise<UnifiedExtractionResult>
```

### 3. Update Debug Info

Tambah step baru di debug:
```typescript
{
  step: 'unified_extraction',
  status: 'success' | 'failed',
  details: 'Gemini unified extraction with enhanced prompts'
}
```

---

## Technical Specifications

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/youtube-strategy-import/gemini-unified-extract.ts` | **CREATE** | New unified extraction logic |
| `supabase/functions/youtube-strategy-import/index.ts` | **MODIFY** | Integrate unified extraction as primary method |
| `supabase/functions/youtube-strategy-import/gemini-transcribe.ts` | **KEEP** | Fallback if unified fails |

### New Interface Definition

```typescript
export interface UnifiedExtractionResult {
  success: boolean;
  canAccessVideo: boolean;
  transcriptPreview?: string;
  transcriptWordCount?: number;
  methodology?: {
    methodology: string;
    confidence: number;
    evidence: string[];
    reasoning: string;
  };
  strategy?: ExtractedStrategy;
  error?: string;
}
```

### Prompt Merge Strategy

1. **Inject full enhanced prompts** ke dalam unified prompt
2. **Temperature: 0.2** (low for accuracy)
3. **Model: gemini-2.5-pro** (better grounding capability)
4. **Require structured JSON output** dengan validation markers

---

## Validation & Quality Checks

### Success Criteria for Unified Extraction:
1. `canAccessVideo: true`
2. `methodology.confidence >= 60`
3. `strategy.entryRules.length >= 1`
4. JSON parseable

### Fallback Triggers:
1. `canAccessVideo: false`
2. JSON parse error
3. API error (429, 402, etc.)
4. Confidence < 60 (ambiguous strategy)

---

## Example Unified Response

```json
{
  "canAccessVideo": true,
  "transcriptPreview": "Okay jadi hari ini kita akan belajar tentang...",
  "methodology": {
    "methodology": "smc",
    "confidence": 85,
    "evidence": [
      "order block di H4",
      "FVG sebagai entry point",
      "BOS sebagai konfirmasi"
    ],
    "reasoning": "Strategy clearly uses SMC concepts..."
  },
  "strategy": {
    "strategyName": "SMC Order Block Strategy",
    "description": "...",
    "entryRules": [...],
    "exitRules": [...],
    "riskManagement": {...}
  }
}
```

---

## Benefits

1. **Efisiensi**: Satu API call vs 2-3 calls
2. **Akurasi**: Full context dalam satu prompt
3. **Konsistensi**: Tidak ada data loss antar step
4. **Debugging**: Unified response easier to trace
5. **Fallback ready**: Traditional pipeline tetap ada sebagai backup

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Gemini API tidak support grounding | Fallback to traditional pipeline |
| Response too long | Limit to first 10k chars of video content |
| JSON parse error | Robust parsing with markdown cleanup |
| Low confidence result | Return for manual review, don't auto-save |

