FROM node:22-alpine AS base
WORKDIR /app
COPY src/package*.json ./
# Set production environment and install only prod dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./
EXPOSE 3000
CMD ["npm", "start"]
