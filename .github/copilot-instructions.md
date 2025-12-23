<!-- Copilot / AI agent instructions for JourneyConnect -->
# JourneyConnect — Copilot Instructions

Purpose: Help AI coding agents get productive quickly in this repository.

- **Quick start (local dev)**:
  - Install deps: `npm install`.
  - Provide API key before running dev server: in PowerShell run:
    ```powershell
    $env:API_KEY = "YOUR_GOOGLE_GENAI_KEY"
    npm run dev
    ```
  - App served via Vite on port `3000` (see `vite.config.ts`). Routing uses `HashRouter` — URLs include `#`.

- **Architecture (big picture)**:
  - React + Vite front-end. Entry: `index.tsx` → `App.tsx` (routes). Pages live under `pages/`, reusable UI under `components/`.
  - `services/` contains integration logic: `geminiService.ts` (AI/GenAI prompts), `authService.ts` (login-related), and `utils/storage.ts` handles persistence and server sync.
  - Persistence: primary backend is a Google Apps Script Web App (URL in `utils/constants.ts` as `GOOGLE_SCRIPT_URL`). `utils/storage.ts` will fallback to localStorage when that URL is not configured.

- **Key conventions & patterns**:
  - Dates: always `YYYY-MM-DD` (see `types.ts` and AI prompt expectations).
  - Times: `HH:mm` format for departure/arrival.
  - Local cache keys:
    - Current user: `journeyconnect_current_user`
    - Tickets cache: `journeyconnect_tickets_v3`
  - Optimistic updates: `saveTicket` and `deleteTicket` first update localStorage then call the Apps Script API.
  - Server is treated as source-of-truth; `getStoredTickets` merges server data + pending local tickets (server wins for confirmed data).

- **AI / GenAI specifics**:
  - All GenAI usage is in `services/geminiService.ts`. Functions to know:
    - `parseTicketIntent(text)` — extracts ticket fields from free text.
    - `findMatchesAI(query, availableTickets)` — returns `matchedIds` array.
    - `analyzeRouteMatches(userFrom, userTo, tickets)` — returns `{ exact: string[], partial: string[] }`.
    - `lookupTrainInfo(trainNumber)` and `getUpdatedTrainTimings(...)` — uses optional `googleSearch` tool.
  - Keep `responseSchema` blocks intact when editing prompts — the UI expects JSON-shaped responses and the repo uses `extractJSON()` to sanitize AI output (it strips code fences and isolates JSON objects).

- **Important files to inspect when changing behavior**:
  - `utils/constants.ts` — replace `GOOGLE_SCRIPT_URL` with your Apps Script deploy URL and update `INDIAN_STATIONS` if needed.
  - `services/geminiService.ts` — edit prompts carefully; tests rely on the JSON schema returned.
  - `utils/storage.ts` — merge and fallback logic; keep optimistic update behavior.
  - `services/authService.ts` — contains a dev fallback: if `GOOGLE_SCRIPT_URL` looks like placeholder, `pin === '1234'` creates a demo user.
  - `types.ts` — canonical enums and interfaces (Ticket, User). Use these types for any data shaping.
  - `pages/Home.tsx` and `pages/ListingForm.tsx` — contain the search/AI flows and dedupe logic used in the app.

- **Project-specific matching & search rules** (encoded in prompts):
  - City clustering: several major terminals are treated as equivalent (Mumbai, Delhi, Hyderabad, Bangalore, Kolkata, Chennai). See examples in `geminiService.ts` prompts.
  - Smart class/date handling: UI allows `isFlexibleDate` and `isFlexibleClass` and storage/filters use these flags for looser matching.

- **Developer workflow & pitfalls**:
  - Environment keys: `vite.config.ts` copies `API_KEY` into `process.env.API_KEY` for the browser; set `API_KEY` before `npm run dev` or use an `.env` file (do NOT commit secrets).
  - Routing uses `HashRouter` which matters for deployments — preserve it unless you intend to change hosting config.
  - `FindTicket.tsx` is deprecated (empty proxy). Use `pages/Home.tsx` for search work.
  - UI uses Tailwind — devDependencies include `tailwindcss` and `postcss`.

- **Example Ticket object (canonical shape)**:
  ```json
  {
    "id": "abc123",
    "userId": "sheet_9876543210",
    "type": "OFFER",
    "trainName": "Rajdhani Express",
    "trainNumber": "12345",
    "fromStation": "New Delhi (NDLS)",
    "toStation": "Mumbai CSMT (CSMT)",
    "date": "2025-12-24",
    "departureTime": "18:30",
    "arrivalTime": "08:45",
    "duration": "14h 15m",
    "classType": "3A",
    "price": 1200,
    "status": "OPEN",
    "userContact": "9876543210",
    "createdAt": 1700000000000
  }
  ```

If anything here is unclear or you want more detail (e.g., sample prompt edits, unit tests, or a checklist for rotating API keys), tell me which section to expand and I will iterate. 
