#!/bin/bash

# Journal App Python RAG Service Setup Script

echo "🚀 Setting up Python RAG Service for Journal App..."

# Check if Python 3.8+ is installed
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python 3.8+ is required. Found: $python_version"
    exit 1
fi

echo "✅ Python version: $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Python RAG Service setup complete!"
echo ""
echo "To start the service:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Run the service: python main.py"
echo "3. The service will be available at: http://127.0.0.1:8000"
echo ""
echo "API Documentation will be available at: http://127.0.0.1:8000/docs"
