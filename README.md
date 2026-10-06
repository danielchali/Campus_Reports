# Campus Reports

Campus Reports is a full-stack campus incident and maintenance workflow system. It combines a Next.js frontend with an Express + MongoDB backend, supports offline PWA behavior, and delivers role-based dashboards for disciplinary, anonymous, and maintenance request management.

## What this app supports

- Disciplinary case management
- Maintenance issue reporting and tracking
- Anonymous incident reports
- Statement requests
- Evidence upload and documentation
- Audit logs and activity tracking
- Role-based access and dashboards
- DOCX/XLSX export for reports, students, and cases
- Offline-capable PWA with local caching and sync
- AI assistant guidance and notifications

## Roles and dashboards

- Admin
- Security officer
- Chief security officer
- Dean of students
- warden
- Secretary
- Maintenance
- General user / student

Each role has a role-specific dashboard and access to the pages their role is authorized for.

## Project structure

```
Campus_Reports/
├── backend/                 # Express API server and MongoDB models
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Authentication and rate limiting
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── scripts/            # backend helper scripts
│   └── bin/                # server startup entrypoint
├── frontend/                # Next.js application
│   ├── src/app/             # App routes and pages
│   ├── src/components/      # Shared UI components
│   ├── src/utils/           # Utility helpers and access control
│   └── public/              # Static files and PWA assets
├── scripts/                 # Project-level scripts
├── render.yaml              # Render deployment configuration
├── DEPLOYMENT-RENDER.md     # Render deployment guide
└── OFFLINE-FEATURES.md      # Offline / PWA implementation details
```

## Tech stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, React
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT-based auth and role protection
- Real-time: Socket.io notifications
- Exports: DOCX/XLSX generation using `docx`, `exceljs`, `xlsx`, `xlsx`
- Offline support: PWA with service worker and local cache

## Local setup

### 1. Clone repository

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

Or run from the root:

```bash
npm run install-all
```

### 3. Configure backend environment

```bash
cd backend
copy env.example .env
```

Then edit `backend/.env` with your values.

Management roles (admin, security officer, chief security officer, dean of students, warden, registrar, secretary, and maintenance) must complete an email verification code after entering their password. Configure `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and the recipient email on each management account before signing in.

Users can use Google Sign-In when `GOOGLE_CLIENT_ID` (backend) and the matching `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend) are configured. Add each deployed frontend origin to the Google OAuth web client’s authorized JavaScript origins. Existing management accounts with a matching verified email still complete the email 2FA step. New Google users can register as a student or general user; both roles must complete the relevant registration details before their dashboard is opened, while student registration additionally requires the academic, personal, accommodation, and contact steps.

### 4. Start backend

```bash
cd backend
npm run dev
```

### 5. Start frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment variables

### Backend

The backend expects these environment variables in `backend/.env`:

- `NODE_ENV`
- `PORT`
- `JWT_SECRET`
- `MONGODB_URI`
- `CORS_ORIGIN` — comma- or whitespace-separated frontend origins allowed by CORS; surrounding quotes are tolerated but not required.
- `CORS_ORIGIN` — comma- or whitespace-separated frontend origins allowed by CORS.
- `FRONTEND_URL` — primary frontend URL; also added to the CORS allow-list when set.
- `EMAIL_ENABLED`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `ADMIN_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_SITE_NAME`
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- `LOGIN_RATE_LIMIT_WINDOW_MS`
- `CREATE_DEFAULT_USERS`
- `IP_SALT`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL` — backend API base URL, e.g. `http://localhost:5000/api`

## Available scripts

### Root

- `npm run install-all` — install dependencies for frontend and backend
- `npm run dev` — run backend and frontend together (shell-dependent)
- `npm run build` — build the frontend only
- `npm run deploy-pwa` — run the PWA deployment helper
- `npm run test-db` — run database connectivity tests

### Backend

- `npm run dev` — run backend with `nodemon`
- `npm run start` — run backend server normally
- `npm run create-admin` — create a default admin user
- `npm run test-bcrypt` — test password hashing

### Frontend

- `npm run dev` — start Next.js development server
- `npm run build` — build frontend app
- `npm run start` — serve the built frontend
- `npm run generate-pwa-icons` — generate PWA icon assets

## Deployment notes

This repo includes `render.yaml` for Render deployments.

- Backend runs as a Node web service
- Frontend runs as a static web service
- Frontend rewrites `/api/*` requests to the backend service

For full deployment instructions, see `DEPLOYMENT-RENDER.md`.

## Offline & PWA support

- Installable PWA experience
- Offline page at `frontend/public/offline.html`
- Local caching and sync support
- Conflict-resolution support for offline changes

See `OFFLINE-FEATURES.md` for implementation details.

## App functionality

The app provides:

- Login, signup, password reset
- Role-specific dashboards
- Student and staff management
- Disciplinary case tracking
- Maintenance issue reporting and maintenance dashboard
- Anonymous reporting
- Statement requests
- Audit logs and activity history
- Report and export generation
- Profile and account settings
- Help and support pages
- AI assistant support

## License

MIT License
