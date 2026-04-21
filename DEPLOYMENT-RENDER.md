# Deploying Campus Reports to Render

This guide will help you deploy the Campus Reports application to Render with minimal configuration.

## Prerequisites

1. A Render account (https://render.com)
2. A MongoDB database (MongoDB Atlas recommended)
3. This repository forked to your GitHub account

## Deploying the Backend

1. Go to https://dashboard.render.com and sign in
2. Click "New+" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: `kmu-discipline-desk-backend`
   - Region: Choose your preferred region
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start` or `node server.js`
5. Click "Advanced" and add the following environment variables:
   - `NODE_ENV` = `production`
   - `DB_TYPE` = `mongo`
   - `JWT_SECRET` = [your secure secret]
   - `MONGODB_URI` = [your MongoDB connection string]
   - `FRONTEND_URL` = [your frontend URL, e.g., https://your-app.onrender.com]
6. Click "Create Web Service"

## Deploying the Frontend

1. From the Render dashboard, click "New+" and select "Static Site"
2. Connect your GitHub repository
3. Configure the service:
   - Name: `kmu-discipline-desk-frontend`
   - Branch: `main`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `out`
4. Click "Advanced" and add the following environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://your-backend-name.onrender.com/api`
5. Add redirect/rewrite rules:
   - Source: `/*`
   - Destination: `/index.html`
6. Click "Create Static Site"

## Environment Variables Required

### Backend Environment Variables:
- `NODE_ENV` = `production`
- `DB_TYPE` = `mongo`
- `JWT_SECRET` = [a secure random string]
- `MONGODB_URI` = [your MongoDB connection string]
- `FRONTEND_URL` = [your frontend URL]

### Frontend Environment Variables:
- `NEXT_PUBLIC_API_BASE_URL` = `https://your-backend-service.onrender.com/api`

## Custom Domain (Optional)

1. In your Render dashboard, go to your service
2. Click "Settings"
3. Scroll to "Custom Domains"
4. Add your custom domain
5. Follow the DNS instructions provided

## Updating Your Application

To update your deployed application:

1. Push changes to your GitHub repository
2. Render will automatically detect changes and start a new deployment
3. You can monitor the deployment progress in the Render dashboard

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure `FRONTEND_URL` is correctly set in your backend environment variables
2. **Database Connection**: Verify `MONGODB_URI` is correct and your database accepts connections
3. **Environment Variables**: Check that all required environment variables are set
4. **Build Failures**: Check the build logs in the Render dashboard for specific error messages

### Checking Logs:

1. Go to your service in the Render dashboard
2. Click "Logs" to view real-time logs
3. You can also access historical logs from this section

## Support

For issues with deployment, please check:
1. The Render documentation: https://render.com/docs
2. This repository's issues: https://github.com/your-username/KMU-DisciplineDesk/issues