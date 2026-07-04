# SatQuery AI - Multi-Stage Container Dockerfile
# Stage 1: Build Next.js Web Console
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Python Backend & Unified Runner
FROM python:3.11-slim AS runner

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gdal-bin \
    libgdal-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY agent/ ./agent/
COPY models/ ./models/
COPY serve/ ./serve/
COPY data/ ./data/
COPY scripts/ ./scripts/

# Copy built web application
COPY --from=web-builder /app/web/.next ./web/.next
COPY --from=web-builder /app/web/public ./web/public
COPY --from=web-builder /app/web/package*.json ./web/
COPY --from=web-builder /app/web/node_modules ./web/node_modules

EXPOSE 8000 3001

CMD ["uvicorn", "serve.api:app", "--host", "0.0.0.0", "--port", "8000"]
