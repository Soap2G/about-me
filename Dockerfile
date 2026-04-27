# --- Build stage --------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000 || yarn install --network-timeout 600000

COPY . .

# Disable sourcemaps to silence dompurify .ts warnings and shrink the bundle.
ENV GENERATE_SOURCEMAP=false
ENV CI=true

RUN yarn build

# --- Serve stage --------------------------------------------------
# nginx-unprivileged runs as a non-root user and is OpenShift/OKD-friendly
# out of the box (random UIDs in GID 0 can write to the directories it needs).
FROM nginxinc/nginx-unprivileged:1.27-alpine

# nginx-unprivileged listens on 8080 by default, which OKD allows for non-root.
EXPOSE 8080

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
