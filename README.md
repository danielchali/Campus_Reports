# Campus Reports

Campus Reports is a full-stack disciplinary case management application built for educational institutions. It combines a modern Next.js frontend with an Express + MongoDB backend, includes offline-enabled PWA support, and supports role-based workflow for case handling, reporting, evidence, and notifications.

## Key Features

- Role-based access with dashboards for:
  - Admin
  - Security Officer
  - Chief Security Officer
  - Dean of Students
  - Assistant Dean
  - Secretary
  - General users / students
- Student and case management
- Evidence upload and case documentation
- Anonymous reporting and statement request workflows
- Audit logs and activity tracking
- Export reports, students, and cases to DOCX/XLSX
- Offline-first PWA support with sync and conflict handling
- AI assistant integration for guided workflows
- WebSocket notifications via Socket.io

## Project Structure

```
Campus_Reports/
├── backend/                 # Express API, MongoDB models, and business logic
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth and rate limiting
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── scripts/            # backend utility scripts
│   └── bin/                # server startup entrypoint
├── frontend/                # Next.js application
│   ├── src/app/             # Pages and route groups
│   ├── src/components/      # Shared UI components
│   ├── public/              # Static assets, PWA files, offline page
│   └── src/utils/           # Frontend utilities and helpers
├── scripts/                 # Project-level utilities
├── render.yaml              # Render deployment configuration
├── DEPLOYMENT-RENDER.md     # Render deployment guide
└── OFFLINE-FEATURES.md      # Offline and PWA implementation details
```

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, React
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT-based login and role protection
- Export: DOCX and XLSX generation using `docx`, `exceljs`, `xlsx`
- Real-time: Socket.io notifications
- PWA: Service worker offline support and installable app experience

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/iamdanielchali/Campus_Reports.git
cd Campus_Reports
```

### 2. Install dependencies

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

Or from the root:

```bash
npm run install-all
```

### 3. Configure backend environment

Copy the backend example env file:

```bash
cd backend
copy env.example .env
```

Then update values inside `backend/.env`.

### 4. Run the backend

```bash
cd backend
npm run dev
```

The backend listens on `http://localhost:5000` by default.

### 5. Run the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` to access the app.

## Environment Variables

The backend requires:

- `NODE_ENV` - `production` or `development`
- `PORT` - server port (default `5000`)
- `JWT_SECRET` - strong JWT secret
- `MONGODB_URI` - MongoDB connection string
- `CORS_ORIGIN` - allowed frontend origin (e.g. `http://localhost:3000`)
- `FRONTEND_URL` - frontend site URL
- `EMAIL_ENABLED` - `true` / `false`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAIL` - for email notifications
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME` - for AI assistant support

The frontend uses:

- `NEXT_PUBLIC_API_BASE_URL` - backend API base URL (e.g. `http://localhost:5000/api`)

## Running scripts

From the root:

- `npm run install-all` — install both frontend and backend dependencies
- `npm run dev` — start backend and frontend together (may depend on shell behavior)
- `npm run build` — build the frontend only
- `npm run deploy-pwa` — run the PWA deployment helper script
- `npm run test-db` — run database connectivity tests

From `backend/`:

- `npm run dev` — start backend with nodemon
- `npm run start` — start backend normally
- `npm run create-admin` — create a default admin user

From `frontend/`:

- `npm run dev` — start Next.js development server
- `npm run build` — build the frontend
- `npm run start` — serve the built frontend
- `npm run generate-pwa-icons` — generate PWA icon assets

## Deployment

This repository includes `render.yaml` for Render deployment. The backend is configured as a Node web service and the frontend as a static web service.

### Render Notes

- Frontend builds from `frontend/` and publishes `frontend/.next`
- Backend uses `node server.js`
- The Render frontend rewrites API calls to the backend service via `/api/*`

For more deployment detail, see `DEPLOYMENT-RENDER.md`.

## Offline & PWA Support

- Offline-first application with local caching and sync support
- Installable PWA experience
- Offline fallback page available at `frontend/public/offline.html`

Details are available in `OFFLINE-FEATURES.md`.

## Application Pages

The frontend includes dedicated pages for:

- Login / Signup / Password reset
- Role-specific dashboards
- Student management
- Case management
- Evidence management
- Reports and exports
- Anonymous report submission
- Audit logs
- Profile and settings
- Help and support
- AI assistant

## Notes

- The backend currently uses MongoDB via Mongoose and supports JWT-based auth.
- Anonymous reporting and statement requests are available via dedicated API routes.
- Audit trails help track user activity and case updates.

## License

This project is released under the MIT License.
