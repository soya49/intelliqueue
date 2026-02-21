@echo off

REM IntelliQueue Setup Script for Windows

echo 🚀 IntelliQueue - Smart Queue Management System Setup
echo ======================================================
echo.

REM Backend Setup
echo Setting up Backend...
cd server

if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo ✓ .env created. Please fill in your Firebase credentials.
) else (
    echo ✓ .env already exists
)

echo Installing backend dependencies...
call npm install
echo ✓ Backend dependencies installed

cd ..

REM Frontend Setup
echo.
echo Setting up Frontend...
cd client

if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo ✓ .env created
) else (
    echo ✓ .env already exists
)

echo Installing frontend dependencies...
call npm install
echo ✓ Frontend dependencies installed

cd ..

echo.
echo ======================================================
echo ✓ Setup Complete!
echo ======================================================
echo.
echo Next steps:
echo 1. Update server/.env with your Firebase credentials
echo 2. Start backend: cd server && npm run dev
echo 3. Start frontend: cd client && npm run dev
echo.
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
echo.
