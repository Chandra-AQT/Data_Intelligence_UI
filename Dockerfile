FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT:-4173} --allowed-hosts all"]
