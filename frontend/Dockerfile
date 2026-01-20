FROM node:20-alpine as builder

WORKDIR /app

# Build argument for admin URL token
ARG VITE_ADMIN_URL_TOKEN=secret-admin-panel
ENV VITE_ADMIN_URL_TOKEN=$VITE_ADMIN_URL_TOKEN

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Minimal image to store build artifacts
FROM alpine:latest
COPY --from=builder /app/dist /app/dist

# Container exits immediately, files remain in volume
CMD ["echo", "Frontend build complete"]
