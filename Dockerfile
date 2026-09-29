# ---- dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SESSION_SECRET is hier bewust afwezig: de app leest cookies vóór de
# secret-validatie, zodat prerendering tijdens de build niet crasht.
RUN npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runner
# su-exec: de entrypoint start als root alleen om /data van eigenaar te
# wisselen en draait de app daarna als de onbevoegde gebruiker `node`.
RUN apk add --no-cache openssl su-exec
WORKDIR /app
ENV NODE_ENV=production
# App-code blijft van root (alleen-lezen voor de app); alleen .next is van
# node, omdat `next start` daar zijn cache wil schrijven.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["./docker-entrypoint.sh"]
