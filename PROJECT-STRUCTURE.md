# KMU Discipline Desk - Project Structure

## Overview
This is a full-stack desktop application built with Next.js (frontend) and Express.js (backend), packaged with Electron for desktop deployment.

## Directory Structure

```
kmu-discipline-desk/
├── 📁 frontend/                 # Next.js frontend application
│   ├── 📁 src/                  # Source code
│   │   ├── 📁 app/             # Next.js app directory
│   │   ├── 📁 components/      # React components
│   │   ├── 📁 hooks/           # Custom React hooks
│   │   ├── 📁 utils/           # Utility functions
│   │   ├── 📁 config/          # Configuration files
│   │   ├── 📁 context/         # React context providers
│   │   ├── 📁 electron/        # Electron-specific code
│   │   └── globals.css         # Global styles
│   ├── 📁 public/              # Static assets
│   ├── 📁 types/               # TypeScript type definitions
│   ├── main.js                 # Electron main process
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   ├── postcss.config.js       # PostCSS configuration
│   ├── .eslintrc.json          # ESLint configuration
│   ├── next-env.d.ts           # Next.js TypeScript definitions
│   ├── README.md               # Frontend documentation
│   └── OFFLINE-FEATURES.md     # Offline functionality guide
│
├── 📁 backend/                  # Express.js backend application
│   ├── 📁 bin/                 # Server startup scripts
│   ├── 📁 controllers/         # Route controllers
│   ├── 📁 middleware/          # Express middleware
│   ├── 📁 migrations/          # Database migrations
│   ├── 📁 models/              # Database models
│   ├── 📁 routes/              # API routes
│   ├── 📁 uploads/             # File upload directory
│   │   └── 📁 evidence/        # Evidence file uploads
│   ├── app.js                  # Express application setup
│   ├── package.json            # Backend dependencies
│   └── .gitignore              # Backend-specific gitignore
│
├── 📁 scripts/                  # Build and deployment scripts
│   ├── build-exe.js            # Electron build script
│   ├── deploy-pwa.js           # PWA deployment script
│   └── README.md               # Scripts documentation
│
├── 📁 .git/                     # Git version control
├── 📁 node_modules/             # Root dependencies
├── package.json                 # Root package configuration
├── package-lock.json            # Dependency lock file
├── .gitignore                   # Git ignore rules
├── .gitattributes               # Git attributes
├── .eslintrc.json               # Root ESLint configuration
├── README.md                    # Main project documentation
├── USER-GUIDE.md                # User guide
└── DEPLOYMENT-GUIDE.md          # Deployment instructions
```

## Key Features

### Frontend (Next.js + Electron)
- **Modern React** with Next.js 13+ App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Electron** for desktop packaging
- **PWA Support** for web deployment
- **Offline functionality** with service workers

### Backend (Express.js)
- **RESTful API** design
- **MongoDB** database integration
- **File upload** handling
- **Authentication** and authorization
- **Database migrations** support

### Build & Deployment
- **Cross-platform** desktop builds
- **PWA deployment** to Vercel
- **Automated build** scripts
- **Environment-specific** configurations

### User Interface
- **Unified profile management** combining profile and settings
- **Responsive design** with Tailwind CSS
- **Dark mode support** with theme switching
- **Accessible navigation** with role-based menus

## Development Workflow

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud)
- Git

### Setup
```bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev
```

### Building
```bash
# Build desktop executable
npm run build

# Deploy as PWA
npm run deploy-pwa
```

## File Organization Principles

1. **Separation of Concerns**: Frontend and backend are completely separate
2. **Modular Structure**: Components, routes, and utilities are organized by feature
3. **Configuration Management**: Environment-specific configs are properly managed
4. **Build Artifacts**: All build outputs are excluded from version control
5. **Documentation**: Each major component has its own documentation

## Clean Code Practices

- ✅ **No build artifacts** in version control
- ✅ **Organized script utilities** in dedicated directory
- ✅ **Comprehensive .gitignore** rules
- ✅ **Clear documentation** for each component
- ✅ **Type safety** with TypeScript
- ✅ **Consistent code style** with ESLint
- ✅ **Modular architecture** with clear separation
- ✅ **Unified user interface** with merged profile/settings pages

## Maintenance

- Build artifacts are automatically cleaned up
- Dependencies are properly managed with lock files
- Scripts are documented and organized
- Configuration files are environment-aware
- Documentation is kept up-to-date 