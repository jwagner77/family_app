# --- STAGE 1: Build Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependency configs and install
COPY frontend/package.json ./
RUN npm install

# Copy source and build static assets
COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Build Production Backend ---
FROM node:18-alpine AS production-runner
WORKDIR /app/backend

# Create a folder for persistent database/uploads mapping
RUN mkdir -p /data

# Copy backend dependencies configs and install
COPY backend/package.json ./
RUN npm install --only=production

# Copy backend source files
COPY backend/ ./

# Copy compiled frontend files from Stage 1 into the public folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Build arguments and environment variables
ARG APP_VERSION=1.0.0
ARG GIT_COMMIT=""
ARG BUILD_NUMBER=""

ENV APP_VERSION=$APP_VERSION
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV PORT=8282
ENV DATA_DIR=/data
ENV DATABASE_PATH=/data/base.db
ENV NODE_ENV=production

# Expose port 8282 and 443 for server mapping
EXPOSE 8282 443

# Mountable volume for data persistence
VOLUME [ "/data" ]

# Start the application
CMD [ "node", "server.js" ]
