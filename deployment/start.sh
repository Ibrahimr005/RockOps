#!/bin/bash
echo "Starting RockOps Sprint 1 Demo..."
docker-compose up -d
echo ""
echo "✅ Application started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo "📦 MinIO Console: http://localhost:9001"
echo ""
echo "To stop the application: docker-compose down"