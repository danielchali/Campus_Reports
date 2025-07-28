# Scripts Directory

This directory contains utility scripts for building, deploying, and managing the KMU Discipline Desk application.

## Available Scripts

### `build-exe.js`
Builds the application into a Windows executable (.exe) file.
- Installs dependencies for both frontend and backend
- Builds the frontend application
- Packages the application with Electron
- Output: `frontend/dist/KMUDisciplineDesk-win32-x64/`

**Usage:**
```bash
npm run build
# or
npm run build-exe
```

### `deploy-pwa.js`
Deploys the application as a Progressive Web App (PWA) to Vercel.
- Builds the frontend for production
- Deploys to Vercel platform
- Provides backend deployment guidance

**Usage:**
```bash
npm run deploy-pwa
```

**Backend deployment guide:**
```bash
npm run deploy-backend
```

### `fix-permissions.js`
Fixes upload directory permissions on Windows systems.
- Creates upload directories if they don't exist
- Sets proper write permissions for file uploads
- Tests write access to ensure functionality

**Usage:**
```bash
npm run fix-permissions
```

### `test-database.js`
Tests database connectivity and configuration.
- Verifies database connection settings
- Tests write operations
- Provides detailed error messages for troubleshooting

**Usage:**
```bash
npm run test-db
```

## Script Dependencies

These scripts require:
- Node.js and npm installed
- Vercel CLI (for PWA deployment)
- Electron (for desktop app building)
- Access to the project's frontend and backend directories

## Troubleshooting

### Upload Issues
If you encounter "Server error" when uploading evidence:
1. Run `npm run fix-permissions` to fix directory permissions
2. Run `npm run test-db` to verify database connectivity
3. Check server logs for detailed error messages
4. Ensure the backend server is running properly

## Notes

- All scripts should be run from the project root directory
- Build artifacts are automatically cleaned up and excluded from version control
- Scripts handle dependency installation automatically 