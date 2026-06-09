FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 8080

CMD ["npm", "start"]
