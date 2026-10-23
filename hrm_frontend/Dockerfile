# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_AUTH_URL
ARG VITE_EMPLOYEE_URL
ARG VITE_ADMIN_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_URL=$VITE_AUTH_URL \
    VITE_EMPLOYEE_URL=$VITE_EMPLOYEE_URL \
    VITE_ADMIN_URL=$VITE_ADMIN_URL

RUN pnpm build

# ---------- Stage 2: serve ----------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80