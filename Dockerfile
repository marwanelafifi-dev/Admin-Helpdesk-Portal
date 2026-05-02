# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY . .

# Run Prisma migrations and seed on startup
RUN npx prisma generate

EXPOSE 3003

CMD ["npm", "run", "dev"]

