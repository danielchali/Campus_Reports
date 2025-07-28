# KMU DisciplineDesk Frontend

A modern Next.js 14 frontend for the KMU Discipline Desk system.

## Features
- Secure login (email/password) with offline authentication support
- Dashboard, Students, Cases, Reports, Admin, Audit, Profile, Help
- **Offline-first:** works without internet, syncs when online
- Desktop app (.exe) and web app support
- Professional UI with KMU branding
- **Bulk Export:** Export users, students, and cases to Word (DOCX) and Excel (XLSX) with one click
- **Progressive Web App (PWA):** Installable with offline capabilities

---

## Getting Started

### 1. Backend API (Node.js)
Start the backend server:
```
cd backend
npm install
npm run dev # or npm start
```
- The backend runs on [http://localhost:5000](http://localhost:5000) by default.
- See backend/README.md for more details.

### 2. Frontend (Web App)
```
cd frontend
npm install
npm run build
npm run start
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Frontend (Desktop App)
- In a new terminal (after starting backend):
```
npm run electron-dev
```
- This opens the desktop app window.

### 4. Package as .exe
```
npm run build
npm run electron-pack
```
- Find your `.exe` in the `dist/` folder (e.g., `dist/KMUDisciplineDesk-win32-x64/`).

---

## Offline Capabilities

### 🔐 Offline Authentication
The application supports offline login with the following requirements:
- **Prerequisites:** User must have logged in online at least once
- **Credential Caching:** Login data is encrypted and stored locally
- **Expiration:** Offline credentials expire after 30 days
- **Fallback:** App tries online login first, then falls back to offline

### 📱 What Works Offline
- ✅ **View all cached data** (students, cases, evidence, etc.)
- ✅ **Navigate between pages**
- ✅ **Search and filter cached data**
- ✅ **Create new records** (queued for sync)
- ✅ **Update existing records** (queued for sync)
- ✅ **Delete records** (queued for sync)
- ✅ **User authentication** (with cached credentials)

### 🚨 What Requires Online Connection
- ❌ **Real-time data updates**
- ❌ **Export functionality**
- ❌ **File uploads**
- ❌ **User registration**
- ❌ **Password changes**
- ❌ **First-time login** (requires backend)

### 🔄 Sync & Conflict Resolution
- **Automatic Sync:** Changes made offline sync when back online
- **Conflict Detection:** Identifies data conflicts between local and server
- **User Resolution:** Interface to choose which version to keep
- **Background Sync:** Seamless sync without user intervention

### 🧪 Testing Offline Mode
1. **Start backend** and log in normally
2. **Stop backend** server
3. **Try logging in** with same credentials
4. **Test functionality** - should work with cached data
5. **Restart backend** - changes will sync automatically

---

## Export Features
- Export **Users**, **Students**, and **Cases** to Word (DOCX) and Excel (XLSX) from their respective pages.
- Analytics/Reports can be exported to Excel from the Reports page.
- All export endpoints are protected by authentication and role-based access.

---

## Progressive Web App (PWA)
- **Installable:** Add to home screen on mobile/desktop
- **Offline Support:** Works without internet connection
- **Background Sync:** Syncs data when connection is restored
- **App-like Experience:** Full-screen mode and native feel

---

## Codebase Cleanup
- **Test files** and **mock files** have been removed for production.
- **Build artifacts** (`.next/`, `node_modules/`, `tsconfig.tsbuildinfo`) are not included in a clean codebase. Reinstall with `npm install` and rebuild as needed.
- **Jest config files** have been removed (no frontend tests by default).
- **Assets:** Place only required assets in `frontend/public/` (do not duplicate).

---

## Environment Variables
- Set `NEXT_PUBLIC_API_BASE_URL` in your `.env.local` to point to your backend API (default: `http://localhost:5000/api`).

---

## Offline-First Architecture

### 🏗️ Technical Implementation
- **Service Worker:** Caches static files and API responses
- **IndexedDB:** Local database for all entity types
- **Offline API:** Network-first with cache fallback strategy
- **Sync Queue:** Manages offline changes and conflicts
- **Conflict Resolution:** User-friendly conflict management UI

### 📊 Performance Benefits
- **Reduced Network Usage:** Cached responses minimize API calls
- **Instant Data Access:** No loading states for cached data
- **Seamless Transitions:** Smooth offline/online switching
- **Better Reliability:** Works in poor network conditions

### 🔧 Advanced Features
- **Background Sync:** Automatic sync when connection restored
- **Conflict Detection:** Identifies data conflicts automatically
- **User Resolution:** Choose local or server version
- **Cache Management:** Intelligent cache invalidation
- **Storage Optimization:** Efficient use of local storage

For detailed technical documentation, see [OFFLINE-FEATURES.md](./OFFLINE-FEATURES.md).

---

## Support
For issues, open an issue on GitHub or contact the maintainers.