#!/bin/bash

echo "🚀 Starting RockOps Sprint 1 Demo..."
echo "📦 This will automatically set up all services including file storage..."
echo ""

# Start all services
docker-compose up -d

echo ""
echo "⏳ Waiting for all services to initialize..."
echo "   - PostgreSQL Database"
echo "   - MinIO File Storage (with automatic bucket setup)"
echo "   - Backend API"
echo "   - Frontend Application"
echo ""

# Wait for services to be ready
sleep 30

echo ""
echo "✅ Application started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo "📦 MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Note: File storage is automatically configured with proper permissions"
echo "🛑 To stop: docker-compose down"
echo ""