# RockOps Local Deployment Test Script

Write-Host "RockOps Local Deployment Test" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Step 1: Clean up any existing containers
Write-Host ""
Write-Host "Cleaning up existing containers..." -ForegroundColor Yellow
docker-compose -f compose-test.yaml down -v
docker-compose down -v

# Step 2: Build the backend
Write-Host ""
Write-Host "Building backend Docker image..." -ForegroundColor Yellow
docker-compose -f compose-test.yaml build backend

# Step 3: Start all services
Write-Host ""
Write-Host "Starting all services..." -ForegroundColor Yellow
docker-compose -f compose-test.yaml up -d

# Step 4: Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 5: Check service health
Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Yellow
docker-compose -f compose-test.yaml ps

# Step 6: Check backend logs
Write-Host ""
Write-Host "Backend logs (last 20 lines):" -ForegroundColor Yellow
docker-compose -f compose-test.yaml logs backend --tail=20

# Step 7: Test endpoints
Write-Host ""
Write-Host "Testing backend endpoints..." -ForegroundColor Yellow

# Test health endpoint
Write-Host "Testing health endpoint..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -Method GET
    Write-Host "Health check passed: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
}

# Test CORS with Vercel origin
Write-Host ""
Write-Host "Testing CORS configuration..."
try {
    $headers = @{
        "Origin" = "https://rock-ops.vercel.app"
    }
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/login" -Method OPTIONS -Headers $headers
    Write-Host "CORS test passed" -ForegroundColor Green
} catch {
    Write-Host "CORS test response: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "MinIO Console: http://localhost:9003" -ForegroundColor White
Write-Host "PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "Frontend (Vercel): https://rock-ops.vercel.app" -ForegroundColor White

Write-Host ""
Write-Host "Local deployment test complete!" -ForegroundColor Green
Write-Host "Now you can test your Vercel frontend with the local backend." -ForegroundColor Green
Write-Host ""
Write-Host "To stop all services, run:" -ForegroundColor Yellow
Write-Host "docker-compose -f compose-test.yaml down" -ForegroundColor White 