# RockOps Local Testing Guide

## 🎯 Objective
Test the containerized backend locally with the Vercel-deployed frontend before pushing to production.

## 📋 Prerequisites
- Docker Desktop running
- Git installed
- PowerShell (Windows)
- Chrome/Edge browser with developer tools

## 🚀 Testing Steps

### 1. Start Local Backend Services

```powershell
# Run the test script
.\test-local-deployment.ps1
```

Or manually:
```powershell
# Clean up existing containers
docker-compose -f compose-test.yaml down -v

# Build and start services
docker-compose -f compose-test.yaml build backend
docker-compose -f compose-test.yaml up -d

# Check logs
docker-compose -f compose-test.yaml logs -f backend
```

### 2. Verify Services Are Running

1. **Backend API**: http://localhost:8080/actuator/health
   - Should return `{"status":"UP"}`

2. **MinIO Console**: http://localhost:9003
   - Login: `minioadmin` / `minioadmin`
   - Verify `rockops` bucket exists

3. **Check Backend Logs**:
   ```powershell
   docker-compose -f compose-test.yaml logs backend
   ```
   - Look for: "✅ Bucket already exists: rockops"
   - Look for: "Started BackendApplication"

### 3. Configure Browser for Testing

Since your Vercel frontend expects a different API URL, use one of these methods:

#### Method A: Browser Extension (Recommended)
1. Install "ModHeader" extension for Chrome/Edge
2. Add a request header override:
   - Name: `Host`
   - Value: `localhost:8080`
3. Add URL redirect rule (if extension supports it)

#### Method B: Local DNS Override
Add to `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1 your-backend.railway.app
```
Then access: http://your-backend.railway.app:8080

#### Method C: Browser Developer Tools
1. Open https://rock-ops.vercel.app
2. Open Developer Tools (F12)
3. In Console, override the API URL:
   ```javascript
   // Temporarily override API calls
   window.API_BASE_URL = 'http://localhost:8080';
   ```

### 4. Test Critical Functionality

#### A. Authentication
1. Login with test credentials
2. Verify JWT token is received
3. Check network tab for CORS headers

#### B. File Upload (Employee Image)
1. Navigate to HR > Employees
2. Edit an employee
3. Upload a profile image
4. Verify:
   - Upload succeeds
   - Image appears in MinIO console
   - Image displays in the application

#### C. Data Operations
1. Create a new employee
2. Update employee information
3. View equipment list
4. Check any CRUD operations

### 5. Debugging Checklist

If something doesn't work:

- [ ] Check backend logs: `docker-compose -f compose-test.yaml logs backend`
- [ ] Verify CORS headers in Network tab
- [ ] Check browser console for errors
- [ ] Ensure all services are running: `docker-compose -f compose-test.yaml ps`
- [ ] Test API directly: `curl http://localhost:8080/api/v1/employees`

## 🛠️ Common Issues & Solutions

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` includes `https://rock-ops.vercel.app`
- Check response headers for `Access-Control-Allow-Origin`

### Connection Refused
- Ensure Docker Desktop is running
- Check if ports 8080, 9002, 9003 are free
- Restart Docker services

### MinIO Issues
- Verify bucket exists in MinIO console
- Check MinIO credentials match in backend config
- Ensure public policy is set on bucket

## 📦 After Successful Testing

1. **Stop services**:
   ```powershell
   docker-compose -f compose-test.yaml down
   ```

2. **Commit changes**:
   ```powershell
   git add .
   git commit -m "Configure backend for Railway deployment with MinIO support"
   git push origin main
   ```

3. **Proceed to Railway deployment**

## 🚨 Important Notes

- The test uses different volumes (`postgres_data_test`, `minio_data_test`) to avoid conflicts
- CORS is configured for both Vercel production and local development
- All changes are isolated to test files, production compose.yaml remains unchanged 