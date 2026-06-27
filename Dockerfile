# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy root monorepo config and lockfile
COPY package*.json ./
# Copy workspaces package files for dependency resolution
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Perform frozen-lockfile dependency install for all workspaces
RUN npm ci

# Copy frontend source files
COPY frontend/ ./frontend/
# Build the frontend workspace (outputs to /app/frontend/dist)
RUN npm run build --prefix frontend

# Stage 2: Run the Express API backend
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy root monorepo config and lockfile
COPY package*.json ./
# Copy workspace package files for workspace resolution
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install only production dependencies for the backend workspace
RUN npm ci --workspace=backend --omit=dev

# Copy backend source files
COPY backend/ ./backend/

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Cloud Run defaults to port 8080
EXPOSE 8080

# Execute backend from the root context
CMD ["node", "backend/server.js"]
