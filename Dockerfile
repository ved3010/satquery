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

