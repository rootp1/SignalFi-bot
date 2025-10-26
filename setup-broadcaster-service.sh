#!/bin/bash

# Broadcaster Service Setup Script
# This script sets up MongoDB and installs all dependencies

set -e  # Exit on error

echo "🚀 SignalFi Broadcaster Service Setup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if MongoDB is installed
echo "📦 Checking MongoDB installation..."
if command -v mongod &> /dev/null; then
    print_success "MongoDB is already installed"
    MONGO_VERSION=$(mongod --version | head -n 1)
    print_info "Version: $MONGO_VERSION"
else
    print_warning "MongoDB is not installed"
    echo ""
    echo "Please install MongoDB first:"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt update"
    echo "  sudo apt install -y mongodb"
    echo "  sudo systemctl start mongodb"
    echo ""
    echo "macOS:"
    echo "  brew tap mongodb/brew"
    echo "  brew install mongodb-community"
    echo "  brew services start mongodb-community"
    echo ""
    echo "Docker:"
    echo "  docker run -d -p 27017:27017 --name mongodb mongo:latest"
    echo ""
    read -p "Press Enter after installing MongoDB to continue..."
fi

# Check if MongoDB is running
echo ""
echo "🔍 Checking if MongoDB is running..."
if nc -z localhost 27017 2>/dev/null; then
    print_success "MongoDB is running on port 27017"
else
    print_warning "MongoDB doesn't appear to be running"
    echo ""
    echo "Start MongoDB with:"
    echo "  sudo systemctl start mongodb    (Ubuntu/Debian)"
    echo "  brew services start mongodb-community    (macOS)"
    echo ""
    read -p "Start MongoDB and press Enter to continue..."
fi

# Install broadcaster-service dependencies
echo ""
echo "📦 Installing broadcaster-service dependencies..."
cd broadcaster-service
if npm install; then
    print_success "Broadcaster service dependencies installed"
else
    print_error "Failed to install broadcaster-service dependencies"
    exit 1
fi
cd ..

# Install broadcaster-bot dependencies
echo ""
echo "📦 Installing broadcaster-bot dependencies..."
cd broadcaster-bot
if npm install; then
    print_success "Broadcaster bot dependencies installed"
else
    print_error "Failed to install broadcaster-bot dependencies"
    exit 1
fi
cd ..

# Install user-bot dependencies
echo ""
echo "📦 Installing user-bot dependencies..."
cd user-bot
if npm install; then
    print_success "User bot dependencies installed"
else
    print_error "Failed to install user-bot dependencies"
    exit 1
fi
cd ..

# Check .env file
echo ""
echo "🔍 Checking environment configuration..."
if [ -f .env ]; then
    print_success ".env file exists"
    
    # Check for required variables
    if grep -q "MONGODB_URI" .env; then
        MONGODB_URI=$(grep MONGODB_URI .env | cut -d '=' -f2)
        print_info "MongoDB URI: $MONGODB_URI"
    else
        print_warning "MONGODB_URI not found in .env, using default"
    fi
else
    print_warning ".env file not found"
    echo "Creating .env file with default values..."
    cat > .env << 'EOF'
# Telegram Bot Tokens
broadcaster_bot_token=YOUR_BROADCASTER_BOT_TOKEN
user_bot_token=YOUR_USER_BOT_TOKEN

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/signalfi

# Broadcaster Service
BROADCASTER_SERVICE_PORT=3001
BROADCASTER_SERVICE_URL=http://localhost:3001

# RPC Configuration
RPC_URL=https://achievement-acts-content-guys.trycloudflare.com
EOF
    print_success "Created .env file"
    print_warning "Please update bot tokens in .env file"
fi

# Test MongoDB connection
echo ""
echo "🧪 Testing MongoDB connection..."
if mongosh --eval "db.version()" --quiet > /dev/null 2>&1; then
    MONGO_VERSION=$(mongosh --eval "db.version()" --quiet)
    print_success "Successfully connected to MongoDB v$MONGO_VERSION"
else
    print_warning "Could not connect to MongoDB with mongosh"
    print_info "This is okay if you're using an older version (mongo shell instead of mongosh)"
fi

# Summary
echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Start the broadcaster service:"
echo "   cd broadcaster-service"
echo "   npm start"
echo ""
echo "2. In a new terminal, start the broadcaster bot:"
echo "   cd broadcaster-bot"
echo "   npm start"
echo ""
echo "3. In another terminal, start the user bot:"
echo "   cd user-bot"
echo "   npm start"
echo ""
echo "4. Test the service:"
echo "   curl http://localhost:3001/health"
echo ""
echo "📚 Documentation:"
echo "   - Setup Guide: BROADCASTER_SERVICE_SETUP.md"
echo "   - Architecture: ARCHITECTURE_DIAGRAM.md"
echo "   - Summary: MONGODB_SERVICE_SUMMARY.md"
echo ""
print_success "All set! Happy broadcasting! 🎙️"
