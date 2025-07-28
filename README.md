# KMU Discipline Desk

A comprehensive disciplinary case management system for KMU.

## Project Structure

```
kmu-descipline-desk/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable components
│   │   ├── lib/            # Utility functions and configurations
│   │   └── types/          # TypeScript type definitions
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

## Development

- Frontend runs on: http://localhost:3000
- Backend API runs on: http://localhost:5000

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License.
