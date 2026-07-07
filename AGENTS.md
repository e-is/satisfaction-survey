# Project Instructions & AI Guidelines (Inquiry)

This document consolidates all context, conventions, and architectural guidelines for AI agents to ensure consistent and high-quality contributions.

## 🔄 Mandatory Workflow: Recompilation and Restart
Following user instructions, **ALWAYS** recompile the client and restart the server after any modification to ensure the latest changes are served and tested correctly.

**Execution Steps:**
1. **Recompile Client:** `cd client && npm run build`
2. **Restart Server:** Restart the `node server.js` process (or `npm start`). **Note:** If port 5000 is still in use by an old process, kill it first (`kill -9 $(lsof -t -i:5000)`) before starting a fresh server.

---

## 🏗 Architecture & Tech Stack

### Backend
- **Framework**: Node.js with Express.
- **URL**: L'application est servie et disponible sur `http://localhost:5000`.
- **Storage**: Simple JSON files stored in the `/data` directory (NoSQL-like approach). Survey data files must start with `enquete_` and end with `.json`.
- **Authentication**: Credentials are stored in `config/auth.json` (auto-generated at startup if missing). All routes that fetch, update, or delete surveys require a valid `Bearer` authentication header validated by `authMiddleware`.
- **Endpoints**:
  - `POST /api/survey` - (Public) Receives survey data and saves it as a JSON file.
  - `POST /api/login` - (Public) Authenticates user against `config/auth.json` and returns a Base64-encoded token.
  - `GET /api/survey` - (Protected) Fetches all registered surveys (ignoring configuration files).
  - `PUT /api/survey/:filename` - (Protected) Updates specific survey (e.g. toggling the "comptabilise" status).
  - `DELETE /api/survey/:filename` - (Protected) Deletes specific survey.
- **Production**: Serves the React frontend from `/client/dist`.

### Frontend
- **Framework**: React 19+ with TypeScript.
- **Build Tool**: Vite 8+.
- **Routing**: Client-side routing managed by a custom, lightweight, dependency-free router hook (`client/src/useRouter.ts`). Distinct URLs:
  - `/` or `/survey` - Serves the public questionnaire form.
  - `/results` - Serves the "Gestion des résultats" (requires username/password login, persists credentials via `localStorage`).
  - Le bouton de menu `⁝` (id `#menu-trigger`) n'a plus de tooltip natif et déploie un menu déroulant au clic contenant le bouton `📊 Gestion des résultats` (id `#btn-goto-results`) qui permet de naviguer vers la page d'administration.
- **Styling**: Tailwind CSS 4+ (using `@tailwindcss/vite` plugin).
- **State Management**: React `useState` for form handling.
- **Score global** : Une card `Score global` (id `#global-score-text`) sous la card `Synthèse graphique` affiche dynamiquement le score cumulé `A` de l'enquête (somme des produits `importance * evaluation` de chaque critère) et le score maximal `B` de l'enquête (somme des scores d'importance multipliée par la note maximale de l'échelle d'évaluation, extraite de façon dynamique depuis `evaluationLegend` pour éviter toute valeur codée en dur).
- **Appréciation globale** : La card de commentaire textuelle libre a été renommée en `Appréciation globale` dans l'interface utilisateur. La variable de code correspondante utilise le terme anglais `appreciation` pour respecter la convention de codage en anglais, tout en restant rétrocompatible avec l'ancienne clé `comments` présente dans les fichiers d'enquêtes plus anciens.

### Testing
- **Framework**: Playwright for End-to-End (E2E) testing. Covers public form submission, routing URL validations, login failure/success checks, data updates, deletion, and logout flow.
- **Location**: `/tests` directory.

---

## 🛠 Project Conventions

### General Guidelines
- **License**: All files should include `// License: AGPL-3.0-only`.
- **Language**: Use French for the user interface (UI) and English for code (variables, functions, comments).
- **Naming**:
  - React components: PascalCase (e.g., `App.tsx`).
  - Helper functions/Variables: camelCase.
  - Survey files: `enquete_{client_cleaned}_{timestamp}.json`.

### Frontend Conventions
- **TypeScript**: Use strict typing. Define interfaces for all data structures (e.g., `Criterion`, `Category`, `SurveyData`).
- **Styling**: Prefer Tailwind 4 utility classes. Avoid custom CSS unless necessary.
- **Accessibility**: Always use `label` with `htmlFor` linked to input `id`.
- **UI Architecture**: Keep logic centralized in `App.tsx` for now, but split into components (e.g., `Header`, `RatingSection`) if the file exceeds 600 lines.

### Backend Conventions
- **Error Handling**: Use `try/catch` blocks and return appropriate HTTP status codes with clear error messages in JSON format.
- **Security**: Sanitize file names before saving to disk to prevent directory traversal or invalid characters.

---

## 📜 Strategic Mandates

### Development Workflow
- **Research**: Always verify the current state of the project before implementation. Use `grep_search` to find criteria or UI elements.
- **Execution**: When editing `App.tsx`, immediately update the corresponding E2E tests in `tests/survey.spec.ts`.
- **Validation**: After any frontend change, run `cd client && npm run build` to verify Tailwind 4 and TypeScript compilation.
- **Testing**: Run `npx playwright test` to ensure no regressions in the survey submission flow.

### Safety & Integrity
- **No Hacks**: Never disable TypeScript strict mode or suppress linter warnings without explicit user instruction.
- **Data Protection**: Do not commit changes to the `data/` directory. It is for local JSON storage only.
- **Environment**: Be aware that Tailwind 4 uses `@import "tailwindcss";` and doesn't require a `tailwind.config.js`.

---

## 🚀 Common Workflows

### Build & Start
```bash
# Full installation
npm install && cd client && npm install

# Build the client
cd client && npm run build

# Start the server (Production mode)
cd .. && npm run start
```

### Running Tests
```bash
# Run all Playwright tests
npx playwright test
```

### Proxy Configuration
The frontend dev server is configured in `vite.config.ts` to proxy `/api` requests to `http://localhost:5000`.
