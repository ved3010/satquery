FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for GIS and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose web port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/examples || exit 1

# Start FastAPI server
CMD ["python", "-m", "satquery.main", "--host", "0.0.0.0", "--port", "8000"]
