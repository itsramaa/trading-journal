

# Evaluasi UI Deep-Dive: Risk Calculator (`/calculator`)

---

## 1. PAGE INTENT

### Primary Intent
> "Sebagai trader, saya ingin menghitung ukuran posisi yang optimal berdasarkan parameter risiko saya sehingga saya dapat masuk trade dengan ukuran yang tepat tanpa overexposure."

### Secondary Intents
1. Mendapatkan rekomendasi stop-loss berbasis volatilitas
2. Memahami bagaimana konteks pasar mempengaruhi sizing
3. Melihat warning sebelum memasukkan trade
4. Melihat estimasi fee dan leverage constraint

### Overlap Check dengan Page Lain
| Page | Potensi Overlap | Status |
|------|----------------|--------|
| Risk Management | Daily Loss, Risk Profile Settings | ✅ OK - link ke settings via `?tab=settings` |
| Trade Entry Wizard | Position sizing step | ⚠️ Partial - wizard juga punya sizing, tapi calculator ini standalone |
| Market Insight | Volatility data | ✅ OK - context saja, bukan duplikasi |

**Kesimpulan:** Page ini memiliki fokus yang jelas sebagai **pre-trade sizing tool**. Tidak ada overlap yang signifikan.

---

## 2. CONTENT & CARD INVENTORY (LENGKAP)

### A. Page Header
| Element | Tujuan | Domain | Status |
|---------|--------|--------|--------|
| Title + Icon | Identifikasi page | UI/Layout | ✅ Sesuai standard |
| Description | Penjelasan konteks | UI/Layout | ✅ Clear |

### B. Symbol Selector (`TradingPairCombobox`)
| Element | Tujuan | Domain | Status |
|---------|--------|--------|--------|
| Label "Trading Pair" | Guidance | Risk/Market | ✅ OK |
| Combobox | Pilih pair untuk kalkulasi | Risk/Market | ✅ Terkoneksi ke MarketContext |

**Alasan Eksistensi:** User harus bisa memilih pair karena commission rate, volatility, dan leverage berbeda per pair.

### C. Top Section - 2 Column Grid
| Card | Component | Tujuan | Domain | Status |
|------|-----------|--------|--------|--------|
| Market Score Widget | `MarketScoreWidget` (compact) | Quick market assessment sebelum sizing | Market | ✅ Compact mode appropriate |
| Context Warnings | `ContextWarnings` | Alert volatilitas, event, korelasi | Risk/Market | ✅ Pre-sizing context |

**Alasan Eksistensi:** Trader perlu tahu kondisi pasar sebelum menentukan ukuran posisi.

### D. Tabs Structure
| Tab | Isi | Tujuan |
|-----|-----|--------|
| Position Size Calculator | Input + Results + Fees + R-reference | Core function |
| Volatility-Based Stop Loss | ATR recommendations | Complementary sizing tool |

### E. Tab 1: Position Size Calculator (DETAIL)

| Section | Component | Tujuan | Domain | Status |
|---------|-----------|--------|--------|--------|
| Calculator Inputs | `CalculatorInputs` | 6 inputs: Balance, Risk%, Entry, SL, Direction, Leverage | Risk | ✅ Complete |
| Separator | Visual break | UI | ✅ OK |
| Calculator Results | `CalculatorResults` | Position size, value, risk amount, potential profit, warnings | Risk | ✅ Core output |
| Commission Rates | Inline section | Real-time fees dari Binance | Binance/Risk | ✅ Useful for accurate sizing |
| Max Leverage Info | Inline section | Leverage constraint per notional | Binance/Risk | ✅ Prevents over-leverage |
| Quick Reference R | `QuickReferenceR` | 1R, 2R, 3R badges untuk mental reference | Risk | ✅ Educational |

### F. Tab 2: Volatility-Based Stop Loss
| Section | Component | Tujuan | Domain | Status |
|---------|-----------|--------|--------|--------|
| Volatility Stats | Grid 2x2 | Daily Vol, ATR, Annualized, ATR Value | Market/Risk | ✅ Contextual data |
| Risk Level Badge | Badge | Visual indicator volatility level | Risk | ✅ Quick assessment |
| Recommendation Message | Conditional text | Guidance based on volatility | Risk | ✅ Actionable |
| Stop Loss Suggestions | 4 rows | Tight, 1x ATR, 1.5x ATR, 2x ATR | Risk | ✅ Actionable |
| Apply Buttons | Arrow buttons | Apply SL to calculator | UX | ✅ Flow integration |
| Adjusted Risk Info | Conditional | Shows volatility adjustment | Risk | ✅ Transparency |

### G. Outside Tabs (Calculator Tab Only)
| Card | Component | Tujuan | Domain | Status |
|------|-----------|--------|--------|--------|
| Risk Adjustment Breakdown | `RiskAdjustmentBreakdown` | Full breakdown of adjustment factors | Risk/AI | ✅ Advanced insight |

---

## 3. ORDERING & HIERARCHY ANALYSIS

### Current Flow
```
1. Page Header
2. Symbol Selector ← NEW (baru ditambahkan phase sebelumnya)
3. [MarketScoreWidget] [ContextWarnings] ← 2-col grid
4. Tabs:
   ├─ Tab 1: Position Size Calculator
   │  ├─ Calculator Inputs (6 fields, 2-col grid)
   │  ├─ Separator
   │  ├─ Calculator Results (2x2 grid cards)
   │  ├─ Commission Rates (conditional)
   │  ├─ Max Leverage Info (conditional)
   │  └─ Quick Reference R (badges)
   └─ Tab 2: Volatility-Based Stop Loss
       ├─ Volatility Stats (2x2 grid)
       ├─ Recommendation
       └─ Stop Loss Suggestions (4 rows with apply buttons)
5. Risk Adjustment Breakdown (outside tabs, calculator tab only)
```

### Evaluation per Hierarchy Level

| Level | Content | Cognitive Load | Verdict |
|-------|---------|----------------|---------|
| 1 | Header + Symbol | Low | ✅ Entry point jelas |
| 2 | Context widgets | Medium | ✅ Konteks sebelum input |
| 3 | Calculator inputs | Medium | ✅ Core action |
| 4 | Results | Medium | ✅ Output dari action |
| 5 | Fees/Leverage | Low | ✅ Supporting info |
| 6 | Quick R | Low | ✅ Reference |
| 7 | Adjustment Breakdown | High | ⚠️ Bisa overwhelming |

### Flow Logic Check
1. **Konteks → Aksi → Hasil → Pendukung** ✅
   - User melihat market context dulu (MarketScore + Warnings)
   - User mengisi input (aksi)
   - User melihat hasil kalkulasi
   - User melihat info pendukung (fees, leverage, R-reference)

2. **Progressive Disclosure** ✅
   - Tab structure memisahkan core calculator dari volatility SL
   - Risk Adjustment Breakdown di luar tab (advanced users)

---

## 4. ISSUES IDENTIFIED (BERDASARKAN ANALISIS MENDALAM)

### Issue 1: Risk Adjustment Breakdown Position (MEDIUM)
**Current:** Di luar tabs, hanya muncul saat calculator tab aktif
**Problem:** 
- Secara visual terpisah dari flow utama
- User mungkin miss karena harus scroll
- Informasinya "heavy" tapi placement-nya tidak jelas

**Impact:** Konten berharga tapi tidak terlihat oleh user yang scroll cepat.

### Issue 2: Tab Label Length (LOW)
**Current:** "Position Size Calculator" dan "Volatility-Based Stop Loss"
**Problem:** Pada mobile, label bisa terpotong atau cramped
**Impact:** Minor UX issue pada viewport kecil

### Issue 3: Commission Rate Decimals Inconsistency (LOW)
**Current:** 
- Page: `.toFixed(3)%` dan `.toFixed(2)` untuk fee amount
- Component `PositionSizeCalculator.tsx`: `.toFixed(2)%` dan `.toFixed(4)`
**Problem:** Inkonsistensi antara page dan standalone component
**Impact:** Minor visual inconsistency

### Issue 4: No Empty State for Missing Data (LOW)
**Current:** Jika Binance tidak connected, beberapa section tidak muncul (conditional render)
**Suggestion:** Could show skeleton atau "Connect Binance" CTA

### Issue 5: Risk Adjustment Breakdown Loading State (MINOR)
**Current:** Shows "Analyzing market conditions..."
**Status:** ✅ Already handled - no issue

---

## 5. PLACEMENT DECISIONS PER CARD/SECTION

### A. Page Header
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Standard, sesuai pattern |

### B. Symbol Selector
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Baru ditambahkan, posisi tepat setelah header |

### C. MarketScoreWidget (compact)
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Pre-sizing context penting, compact mode appropriate |

### D. ContextWarnings
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Alert sebelum sizing = correct mental flow |

### E. Tabs Structure
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | 2 tab memisahkan core calculator dari volatility tool |
| ⚠️ CONSIDER | Pindahkan Risk Adjustment Breakdown ke dalam tab atau collapse |

### F. Calculator Inputs
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Core function, 6 inputs = manageable |

### G. Calculator Results
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Immediate feedback setelah input |

### H. Commission Rates
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Useful for accurate fee estimation |
| 🔧 FIX | Standardize decimals dengan formatters |

### I. Max Leverage Info
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Prevents over-leverage, inline appropriate |

### J. Quick Reference R
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Educational, non-intrusive badges |

### K. Volatility Stats (Tab 2)
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Contextual data untuk SL recommendation |

### L. Stop Loss Suggestions (Tab 2)
| Decision | Reasoning |
|----------|-----------|
| ✅ TETAP | Actionable, apply button integrates flow |

### M. Risk Adjustment Breakdown
| Decision | Reasoning |
|----------|-----------|
| 🔄 PINDAH ke dalam TabsContent calculator | Currently orphaned outside tabs |
| Alternative: Jadikan Collapsible | Reduce cognitive load for casual users |

---

## 6. REKOMENDASI IMPROVEMENT

### Priority 1: Move Risk Adjustment Breakdown (MEDIUM)
**Current Location:** Outside tabs, after `</Tabs>`
**Recommended Location:** Inside `TabsContent value="calculator"`, after `QuickReferenceR`

**Alasan:**
1. Secara logis bagian dari calculator workflow
2. User tidak perlu scroll melewati tabs untuk melihatnya
3. Tetap visible saat user di tab calculator

**Alternative:** Wrap dalam `Collapsible` dengan default collapsed untuk user yang tidak butuh detail.

### Priority 2: Standardize Commission Decimals (LOW)
**File:** `src/pages/PositionCalculator.tsx` lines 226-239
**Issue:** Manual `.toFixed()` calls
**Fix:** Use `formatPercentUnsigned()` dan `formatCurrency()`

```typescript
// Current
{(commissionRate.makerCommissionRate * 100).toFixed(3)}%
(${estimatedFees.makerFee.toFixed(2)})

// Recommended
{formatPercentUnsigned(commissionRate.makerCommissionRate * 100)}
({formatCurrency(estimatedFees.makerFee)})
```

### Priority 3: Shorter Tab Labels on Mobile (LOW)
**Recommendation:** Use abbreviated labels on small screens
```
Desktop: "Position Size Calculator" | "Volatility-Based Stop Loss"
Mobile:  "Calculator" | "Vol. Stop Loss"
```

**Implementation:** CSS media query atau conditional className

---

## 7. FINAL VERDICT

### Page Status: ✅ ALMOST COMPLETE

| Criteria | Status | Notes |
|----------|--------|-------|
| Page intent jelas | ✅ Pass | Pre-trade sizing tool |
| Semua card terinventarisasi | ✅ Pass | 12+ sections documented |
| Urutan konten masuk akal | ✅ Pass | Context → Action → Result → Support |
| Tidak ada konten numpuk | ⚠️ Minor | Risk Adjustment Breakdown slightly orphaned |
| Keputusan placement per card | ✅ Pass | All decisions documented |

### Summary of Changes Needed

| Priority | Change | Impact |
|----------|--------|--------|
| Medium | Move RiskAdjustmentBreakdown inside calculator tab | Better content grouping |
| Low | Standardize commission decimals with formatters | Consistency |
| Low | Shorter tab labels on mobile | Mobile UX |

---

## 8. FILES IMPACTED

| File | Changes |
|------|---------|
| `src/pages/PositionCalculator.tsx` | Move RiskAdjustmentBreakdown, fix decimals, optional mobile labels |

**Estimated Lines Changed:** ~15-20 lines

---

## 9. APPROVAL NEEDED

Sebelum implementasi, konfirmasi:

1. **Risk Adjustment Breakdown:** 
   - Option A: Pindah ke dalam `TabsContent calculator` (recommended)
   - Option B: Jadikan `Collapsible` dengan default collapsed
   
2. **Mobile Tab Labels:**
   - Option A: Keep current (accept cramping)
   - Option B: Shorter labels on mobile

Apakah user menyetujui rekomendasi di atas untuk dilanjutkan ke implementasi?

