FROM node:22-alpine AS base
WORKDIR /app
COPY src/package*.json ./

# Install all dependencies (including dev deps for build)
# Skip npm upgrade to avoid QEMU issues on ARM64 builds
RUN npm ci && npm cache clean --force

COPY src/ ./

# Minify all client-side JavaScript files
RUN npx terser public/js/clientLogin.js -o public/js/clientLogin.min.js --compress --mangle && \
    npx terser public/js/clientDashboard.js -o public/js/clientDashboard.min.js --compress --mangle && \
    npx terser public/js/statisticsModal.js -o public/js/statisticsModal.min.js --compress --mangle && \
    npx terser public/js/modalService.js -o public/js/modalService.min.js --compress --mangle

# Minify all CSS files
RUN npx clean-css-cli -o public/css/bitaxeDashboard.min.css public/css/bitaxeDashboard.css && \
    npx clean-css-cli -o public/css/modal.min.css public/css/modal.css && \
    npx clean-css-cli -o public/css/statisticsModal.min.css public/css/statisticsModal.css && \
    npx clean-css-cli -o public/css/bootstrap.min.css public/css/bootstrap.css

# Remove dev dependencies
RUN npm prune --production

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
