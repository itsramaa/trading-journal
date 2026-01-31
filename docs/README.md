# Trading Journey Documentation

**Last Updated:** 2026-01-31

## Overview

Trading Journey adalah aplikasi trading journal untuk crypto futures dengan integrasi AI.

## Documentation Structure

```
docs/
├── README.md              # This file
├── ARCHITECTURE.md        # System architecture & tech stack
├── DATABASE.md            # Database schema & relationships
├── DOMAIN_MODEL.md        # Trading domain concepts (Binance Futures)
└── DEVELOPMENT.md         # Development guidelines & conventions
```

## Quick Links

- **Architecture**: System design, component structure, data flow
- **Database**: Tables, RLS policies, relationships
- **Domain Model**: Trading lifecycle, income types, P&L calculations
- **Development**: Code conventions, hooks patterns, testing

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand + React Query |
| Backend | Supabase (Lovable Cloud) |
| AI | Lovable AI (Gemini 2.5 Flash) |

## Archive

Legacy documentation moved to `old-docs/` for reference.
