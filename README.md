# FamilyRoots AI — OurLegacy

> One family, one history, countless generations.

**FamilyRoots AI (OurLegacy)** is a full-stack family registration, multigenerational genealogy, 3D heritage visualization, and AI guidance platform.

## Core Capabilities

- **Secure Authentication & Registration**: Firebase Authentication (Google Sign-In & Email/Password option) paired with a full family member registration workflow supporting existing branch joining or new branch proposals, compressed portrait uploads, and automated duplicate candidate flagging.
- **Interactive 2D & 3D Family Trees**:
  - **3D Heritage Constellation (`Three.js`)**: Multi-part procedural 3D heritage medallions, turned plinths, `TubeGeometry` parent-child and marital arcs, `RoomEnvironment` PBR lighting, raycast click-to-inspect, smooth damped camera presets, generation tier separation slider, and collapsible bottom dock.
  - **2D Genealogy Chart**: Expand/collapse generations starting from Generation 0 (Founding Grandfather & Grandmother), ancestor/descendant spotlight filtering, zoom controls, print layout, and PDF export via `jsPDF`.
- **Strict Relationship Integrity**: No relationship is guessed from names. Parent-child and marital links must be explicitly selected and verified by an administrator.
- **FamilyGuide AI**: Server-side `@google/genai` (`gemini-4-hydrogen`) assistant supporting English, Urdu (`اردو`), and Roman Urdu, with administrator escalation logging.
- **Administrator Dashboard**: Real-time statistics, Founding Pair (Gen 0) bootstrapper, duplicate-aware registration approval/rejection queue, relationship verification queue, escalation resolution, and immutable activity logs.
- **Family Archive**: Photo gallery, family history stories, events & announcements, member search directory, upcoming birthday reminders, and light/dark themes.

## Environment Variables

See `.env.example`:
- `GEMINI_API_KEY`: Server-side key for FamilyGuide AI (`POST /api/ai/guide`).
- `APP_URL`: Runtime application URL.

## Scripts

- `npm run dev` — Starts Express + Vite development server on port `3000`.
- `npm run build` — Builds client bundle (`dist/`) and server bundle (`server.js`).
- `npm run start` — Runs production server.
- `npm run lint` — TypeScript check (`tsc --noEmit`).
