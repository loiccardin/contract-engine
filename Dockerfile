FROM node:18-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
