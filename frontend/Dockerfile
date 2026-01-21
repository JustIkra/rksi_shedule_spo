FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for admin URL token
ARG VITE_ADMIN_URL_TOKEN=secret-admin-panel
ENV VITE_ADMIN_URL_TOKEN=$VITE_ADMIN_URL_TOKEN

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Minimal image with copy script
FROM alpine:latest

# Copy built files to a staging location
COPY --from=builder /app/dist /app/build

# Copy script that syncs files to volume on startup
RUN echo '#!/bin/sh' > /app/sync.sh && \
    echo 'rm -rf /app/dist/*' >> /app/sync.sh && \
    echo 'cp -r /app/build/* /app/dist/' >> /app/sync.sh && \
    echo 'echo "Frontend files synced to volume"' >> /app/sync.sh && \
    chmod +x /app/sync.sh

# On startup, sync files to the mounted volume
CMD ["/app/sync.sh"]
