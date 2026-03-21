@echo off
echo Starting Trip Budget Planner...

echo Starting Backend Service...
cd backend-service
start "Backend Service" cmd /k "node server.js"
cd ..

echo Starting Frontend...
cd frontend
start "Frontend Service" cmd /k "npm run dev"
cd ..

echo Both services have been started in separate windows!
echo Please safely close this prompt.
pause
