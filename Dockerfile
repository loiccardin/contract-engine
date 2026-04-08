FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer fonts-liberation fontconfig && rm -rf /var/lib/apt/lists/*
COPY fonts/HelveticaNeue.ttc /usr/share/fonts/truetype/
RUN fc-cache -f -v
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
