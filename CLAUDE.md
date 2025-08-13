# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CantoneseScribe is a Cantonese video transcription service that converts YouTube videos and audio files into accurate transcriptions with Chinese characters, Yale romanization, Jyutping, and English translations. The application consists of a React frontend and a Python FastAPI backend.

## Architecture

### Frontend (`cantonese-scribe-frontend/`)
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router DOM with protected routes
- **State Management**: Local React state with localStorage for auth
- **Key Features**: Video URL processing, real-time progress tracking, multi-format export (SRT, VTT, TXT, CSV)

### Backend (`cantonese-scribe-backend/`)
- **Framework**: FastAPI (Python)
- **Deployment**: Vercel serverless functions
- **Core Services**: Google Speech-to-Text, pyCantonese romanization, Google Translate
- **Features**: User authentication, usage limits, transcription processing

### UI Component System
The frontend uses shadcn/ui components with a comprehensive design system:
- All UI components are in `src/components/ui/`
- Custom components follow the pattern: `<ComponentName />` in `src/components/`
- Styling uses Tailwind CSS with CSS variables for theming
- Typography includes specialized fonts: `font-ui` (PT Sans) and `font-transcription` (Source Code Pro)

## Development Commands

### Frontend Development
```bash
cd cantonese-scribe-frontend
npm run dev          # Start development server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

### Backend Development
```bash
cd cantonese-scribe-backend
python test_basic.py # Run basic FastAPI test server
```

### Testing
```bash
python test_basic.py # Basic API endpoint testing
```

## Key Files and Patterns

### Frontend Structure
- `src/App.tsx` - Main routing and authentication logic
- `src/components/VideoProcessPage.tsx` - Core transcription functionality
- `src/components/AuthenticatedLayout.tsx` - Protected route wrapper
- `src/lib/utils.ts` - Utility functions (cn for className merging)

### Authentication Pattern
Authentication uses localStorage with a simple token-based system:
```typescript
const isAuthenticated = localStorage.getItem('authToken');
```

### API Integration Pattern
The frontend currently uses mock data but is structured for real API integration. All transcription processing shows realistic progress simulation and result formatting.

### Component Development
- Use existing shadcn/ui components from `src/components/ui/`
- Follow the established pattern for new components
- Import from `@/components/` using path aliases
- Use TypeScript interfaces for props and data structures

### Styling Guidelines
- Use Tailwind CSS utility classes
- Leverage CSS custom properties for theming
- Use `cn()` utility for conditional className logic
- Follow the established color system (orange primary, gray neutrals)

## Data Flow and State Management

### Video Processing Flow
1. User submits YouTube URL
2. Progress tracking with realistic simulation
3. Mock transcription data with confidence scores
4. Multi-format export functionality
5. History tracking and user management

### Transcription Data Structure
```typescript
interface TranscriptionItem {
  id: number;
  startTime: number;
  endTime: number;
  chinese: string;
  yale: string;
  jyutping: string;
  english: string;
  confidence: number;
}
```

## Build and Deployment

### Frontend Deployment
The frontend is configured for Vercel deployment with:
- Vite build system
- Static asset optimization
- Path alias resolution (`@/` → `src/`)

### Backend Deployment
Backend uses Vercel serverless functions with:
- `vercel_config.json` for Python runtime configuration
- 300-second timeout for processing-heavy operations
- Environment variable support

## Environment Configuration

### Development Setup
1. Install frontend dependencies: `npm install` in `cantonese-scribe-frontend/`
2. Set up Python virtual environment for backend testing
3. Start frontend dev server: `npm run dev`
4. Test backend with: `python test_basic.py`

### Key Dependencies
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, React Router
- **Backend**: FastAPI, Google Cloud Speech-to-Text, pyCantonese, Google Translate
- **Development**: Vite, ESLint, TypeScript ESLint

## Code Quality and Linting

ESLint configuration includes:
- TypeScript support
- React hooks rules
- React refresh for development
- Unused variables warnings disabled
- Recommended JavaScript and TypeScript rules

Run `npm run lint` to check code quality before commits.