# KMU Discipline Desk

A comprehensive disciplinary case management system for KMU.

## Project Structure

```
kmu-descipline-desk/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable components
│   │   └── lib/            # Utility functions and configurations
│   └── public/             # Static assets
│
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── utils/         # Utility functions
│   └── prisma/            # Database schema and migrations
│
└── docs/                   # Documentation
```

## Features

1. Authentication & Access Control
   - Secure login (Email/Password or Institutional)
   - Role-based access control (admin, academic_office, security_officer)
   - Session management

2. Student Management
   - Student lookup and profile management (admin, academic_office)
   - Disciplinary history tracking

3. Case Management
   - Case creation and tracking (admin, security_officer)
   - Document management (admin, security_officer)
   - Status updates

4. Reporting & Analytics
   - Statistical reports
   - Export functionality

## Tech Stack

- Frontend:
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - NextAuth.js
  - React Query

- Backend:
  - Node.js
  - Express
  - MongoDB (Mongoose)
  - JWT Authentication

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the variables with your configuration

4. Start the development servers:
   ```bash
   # Backend
   cd backend
   npm install
   node server.js

   # Frontend
   cd frontend
   npm install
   npm run build
   npm run start
   ```

## Deployment

### Frontend (Vercel/Netlify/Other Static Host)
1. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` - Your backend API URL (e.g., https://your-backend.onrender.com/api)

### Backend (Render/Railway/Heroku)
1. Create a MongoDB database (MongoDB Atlas recommended)
2. Set environment variables in your hosting platform:
   - `MONGODB_URI` - Your MongoDB connection string
   - `DB_TYPE` - Set to "mongo"
   - `JWT_SECRET` - A secure secret for JWT tokens
   - `FRONTEND_URL` - Your frontend URL (e.g., https://your-frontend.vercel.app)
   - `CORS_ORIGIN` - Your frontend URL (same as above, for backward compatibility)

### Render-Specific Deployment Instructions

#### Frontend Deployment on Vercel:
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://your-backend.onrender.com/api`

#### Backend Deployment on Render:
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following build command:
   ```bash
   npm install
   ```
4. Set the start command:
   ```bash
   node server.js
   ```
5. Set environment variables in Render dashboard:
   - `MONGODB_URI` = your MongoDB connection string
   - `DB_TYPE` = mongo
   - `JWT_SECRET` = your secure JWT secret
   - `FRONTEND_URL` = your frontend URL (e.g., https://your-app.vercel.app)
   - `NODE_ENV` = production
   - `PORT` = 5000

## PWA (Progressive Web App)

The application supports PWA features for offline usage:
- Install as a desktop or mobile app
- Works offline with cached data
- Syncs data when online

To generate proper PWA icons:
```bash
cd frontend
npm run generate-pwa-icons
```

Then follow the instructions to create properly sized icons.

## Troubleshooting

### Dashboard Data Fetching Issues
If dashboards can't fetch data from the database:
1. Check that `NEXT_PUBLIC_API_BASE_URL` is correctly set in your frontend environment
2. Verify that the backend is running and accessible
3. Check browser console for network errors
4. Ensure CORS is properly configured

### PWA Icon Issues
If the PWA is not showing the correct icon:
1. Ensure you have properly sized PNG icons in `frontend/public/icons/`
2. Update `frontend/public/manifest.json` to reference the correct icon paths
3. Verify the service worker is caching the icon files

## Development

- Frontend runs on: http://localhost:3000
- Backend API runs on: http://localhost:5000

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License.