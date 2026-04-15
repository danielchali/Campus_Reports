# KMU Discipline Desk - User Distribution Guide

## Quick Start

### Option 1: PWA (Recommended)

```bash
# 1. Deploy to web
npm run deploy-pwa

# 2. Share the URL with users
# Users can install from the browser
```

### Option 2: Intranet Deployment

```bash
# 1. Build for production
cd frontend
npm run build

# 2. Copy to your server
# 3. Access via http://your-server-ip:3000
```

## For Your Users

### PWA Users
1. Visit the URL, for example `https://kmu-desk.vercel.app`
2. Click `Install` in the browser
3. The app appears on the desktop or home screen
4. The app works offline automatically
5. Users always get the latest version

### Mobile Users
1. Open the browser on a phone or tablet
2. Visit the PWA URL
3. Add the app to the home screen
4. Use the app offline with cached data

## Distribution Methods Comparison

| Method | Ease | Cost | Updates | Offline | Distribution |
|--------|------|------|---------|---------|--------------|
| PWA | High | Free | Auto | Yes | URL only |
| Intranet | Medium | Low | Auto | Yes | Internal network |
| Mobile | High | Free | Auto | Yes | URL only |

## Step-by-Step Deployment

### Phase 1: PWA Deployment

```bash
# 1. Deploy frontend
npm run deploy-pwa

# 2. Deploy backend (choose one)
# Railway, Render, or another Node host

# 3. Update frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com/api

# 4. Share the frontend URL with users
```

### Phase 2: User Instructions

Share this with users:

```text
KMU Discipline Desk is now available.

Web App:
- Visit: [YOUR_URL]
- Click Install in the browser
- The app works offline automatically

Mobile:
- Open the browser on your phone
- Visit: [YOUR_URL]
- Add the app to your home screen

Features:
- Works offline
- Syncs when back online
- No installer required
- Cross-platform access
```

## Advanced Deployment Options

### For Large Organizations

```bash
# 1. Intranet deployment
npm run build

# 2. Docker deployment
docker build -t kmu-desk .
docker run -p 3000:3000 kmu-desk

# 3. Managed browser deployment
# Push the app URL through bookmarks, intranet portal, or MDM
```

### For Educational Institutions

```bash
# 1. LMS integration
# Embed the PWA in Moodle or Canvas

# 2. Computer lab deployment
# Open the PWA on shared machines

# 3. Student access
# Share the PWA URL in course materials
```

## Troubleshooting

### Common Issues

PWA not installing:
- Check that HTTPS is enabled
- Verify `manifest.json` is valid
- Test in another browser

Offline not working:
- Check service worker registration
- Verify IndexedDB is available
- Test sync functionality

Backend connection issues:
- Verify `NEXT_PUBLIC_API_BASE_URL`
- Check CORS configuration
- Test the database connection

### Support Commands

```bash
# Check PWA status
cd frontend
npm run build
```

## Support & Maintenance

### Regular Tasks
- Monitor app performance
- Update dependencies regularly
- Back up the database
- Test offline functionality
- Review user feedback

### Emergency Procedures
- Restore from database backup
- Roll back to a previous deployment
- Enable maintenance mode if needed
- Communicate status updates to users
