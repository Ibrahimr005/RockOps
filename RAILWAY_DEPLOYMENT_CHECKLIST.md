# Railway Deployment Checklist

## 📋 Pre-Deployment Checklist

- [ ] Local testing completed successfully
- [ ] All changes committed and pushed to GitHub
- [ ] Railway account created
- [ ] MinIO alternative chosen (Cloudflare R2, Supabase, etc.)

## 🚂 Railway Deployment Steps

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your repository: `RockOps`
6. Select the `main` branch

### 2. Configure Backend Service

1. Railway will detect your Dockerfile automatically
2. Click on the backend service card
3. Go to "Settings" tab:
   - Set "Root Directory" to `/backend`
   - Set "Watch Paths" to `/backend/**`

### 3. Add PostgreSQL Database

1. In your project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates and links the database
4. Note: `DATABASE_URL` is automatically injected

### 4. Configure Environment Variables

Click on your backend service → "Variables" tab → "Add Variable":

```env
# CORS Configuration
CORS_ALLOWED_ORIGINS=https://rock-ops.vercel.app

# Port Configuration
PORT=8080

# MinIO Configuration (Example with Cloudflare R2)
MINIO_ENDPOINT=https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
MINIO_PUBLIC_URL=https://pub-YOUR-HASH.r2.dev
MINIO_ACCESS_KEY=your-r2-access-key-id
MINIO_SECRET_KEY=your-r2-secret-access-key
MINIO_BUCKET_NAME=rockops

# Optional: Override default admin credentials
SPRING_SECURITY_USER_NAME=admin
SPRING_SECURITY_USER_PASSWORD=your-secure-password
```

### 5. Deploy

1. Railway will automatically start deployment
2. Monitor the build logs
3. Check for any errors
4. Once deployed, Railway provides a URL like: `https://rockops-backend.railway.app`

### 6. Verify Deployment

1. **Health Check**:
   ```
   https://your-app.railway.app/actuator/health
   ```

2. **Test CORS**:
   Open browser console at https://rock-ops.vercel.app and run:
   ```javascript
   fetch('https://your-app.railway.app/actuator/health')
     .then(r => r.json())
     .then(console.log)
   ```

### 7. Update Vercel Frontend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `rock-ops` project
3. Go to "Settings" → "Environment Variables"
4. Add:
   ```
   VITE_API_BASE_URL=https://your-app.railway.app
   ```
5. Redeploy by going to "Deployments" → "Redeploy"

## 🔧 MinIO Alternative Setup

### Option A: Cloudflare R2 (Recommended)

1. Create Cloudflare account
2. Go to R2 Storage
3. Create a bucket named `rockops`
4. Create API tokens:
   - Go to "Manage R2 API Tokens"
   - Create token with "Object Read & Write" permissions
5. Get your credentials:
   - Account ID: Found in R2 overview
   - Access Key ID: From created token
   - Secret Access Key: From created token
   - Endpoint: `https://<account-id>.r2.cloudflarestorage.com`

### Option B: Supabase Storage

1. Create Supabase project
2. Go to Storage section
3. Create `rockops` bucket
4. Set bucket to public
5. Get credentials from Settings → API

## 🧪 Post-Deployment Testing

### 1. Basic Functionality
- [ ] Login works
- [ ] JWT tokens are issued
- [ ] Navigation between pages

### 2. Database Operations
- [ ] Create new employee
- [ ] Update employee data
- [ ] List operations work

### 3. File Storage
- [ ] Upload employee image
- [ ] Image displays correctly
- [ ] Files appear in storage bucket

### 4. Performance
- [ ] Page load times acceptable
- [ ] API response times < 1s
- [ ] No CORS errors in console

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Dockerfile syntax
   - Ensure all files are committed
   - Check Railway build logs

2. **Database Connection Fails**
   - Verify DATABASE_URL is set
   - Check if database is provisioned
   - Look for connection logs

3. **CORS Errors**
   - Verify CORS_ALLOWED_ORIGINS is set correctly
   - Check if it includes https://rock-ops.vercel.app
   - No trailing slashes in URLs

4. **MinIO/Storage Issues**
   - Verify credentials are correct
   - Check bucket exists and is public
   - Test with MinIO client locally first

### Rollback Plan

If deployment fails:
1. Railway keeps previous deployments
2. Go to "Deployments" tab
3. Click on last working deployment
4. Select "Rollback to this deployment"

## 📊 Monitoring

1. **Railway Metrics**
   - CPU usage
   - Memory usage
   - Network traffic
   - Build times

2. **Application Logs**
   - View in Railway dashboard
   - Filter by severity
   - Search for errors

3. **Set Up Alerts**
   - Configure email alerts
   - Set thresholds for resources
   - Monitor uptime

## ✅ Deployment Complete!

Once all checks pass:
1. Share the Railway URL with testers
2. Monitor logs for first 24 hours
3. Set up backups for database
4. Document any custom configurations 