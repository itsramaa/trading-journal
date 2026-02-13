

# Update FEATURE-MATRIX.md Section 2: Trade History — Refined 6-Module Structure

## Overview
Replace the current Trade History section (50 trader features, some duplicated/deprecated) with the user-provided refined structure of **43 features** organized into **6 clear modules**. This reduces noise, removes deprecated entries (#14, #15), and groups features logically.

## Changes

### File: `docs/FEATURE-MATRIX.md`

**Replace Section 2 (lines 68-143+)** with the new 6-module structure:

#### Module 1: Trade History / Viewing (12 features)
Features #1-#12: List/Gallery view, 7 filter types, AI sort, clear filters, infinite scroll, load progress, sub-tabs.

#### Module 2: Trade Enrichment (4 features)
Features #13-#16: Enrich drawer, batch enrichment, needs enrichment badge, all enriched badge.

#### Module 3: Notes / Tags / Screenshots (6 features)
Features #17-#22: Quick note, expand/collapse, notes badge, recently updated badge, tags display, screenshot count.

#### Module 4: Sync & Data Management (13 features)
Features #23-#35: Incremental sync, full sync, range selection, force re-fetch, resume, discard checkpoint, re-sync range, retry failed, progress phases, ETA, quality score, data quality summary, monitoring panel.

#### Module 5: Trade Metrics / Visuals (7 features)
Features #36-#42: R:R tooltip, confluence tooltip, inline fees, fee history tab, funding history tab, strategy badges, AI quality badge.

#### Module 6: External / Miscellaneous (1 feature)
Feature #43: View transaction on Solscan.

### Key Differences from Current Version
- Removed deprecated strikethrough entries (#14, #15 in current doc)
- Consolidated duplicate features (e.g., notes-related items grouped together)
- Added missing precondition/postcondition details from user spec
- Reorganized from flat list to 6 logical sub-sections with headers
- Reduced from 50 to 43 trader features (cleaner, no duplication)
- System features section (2.2) retained and renumbered if needed
- Export CSV moved out of top-level (implicitly covered in viewing module or kept as-is)

### System Features (2.2)
Keep existing 15 system features unchanged -- they are orthogonal to the trader feature reorganization. Only update cross-references if any feature numbers shifted.

### Revision History
Add entry: "v2.3 — Refined Trade History into 6 modules (43 features), removed deprecated/duplicate entries"

