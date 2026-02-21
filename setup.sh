#!/bin/bash

# IntelliQueue Setup Script

echo "🚀 IntelliQueue - Smart Queue Management System Setup"
echo "======================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend Setup
echo -e "${BLUE}Setting up Backend...${NC}"
cd server

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created. Please fill in your Firebase credentials.${NC}"
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

echo "Installing backend dependencies..."
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

cd ..

# Frontend Setup
echo ""
echo -e "${BLUE}Setting up Frontend...${NC}"
cd client

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created${NC}"
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

echo "Installing frontend dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd ..

echo ""
echo -e "${GREEN}======================================================"
echo "✓ Setup Complete!"
echo "======================================================"
echo ""
echo "Next steps:"
echo "1. Update server/.env with your Firebase credentials"
echo "2. Start backend: cd server && npm run dev"
echo "3. Start frontend: cd client && npm run dev"
echo ""
echo "Backend will run on: http://localhost:5000"
echo "Frontend will run on: http://localhost:5173"
echo ""
