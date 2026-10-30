# Etapa de compilación: las dependencias de desarrollo no llegan a la imagen final.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
# Reintentos acotados frente a cortes de red durante la descarga de dependencias.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 1000 \
    && npm config set fetch-retry-maxtimeout 10000 \
    && npm ci --no-audit --no-fund

COPY . ./
RUN npm run build

# Nginx unprivileged sirve el frontend en un puerto no privilegiado.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/nexo/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
