FROM node:22-alpine
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0 PORT=4173 FIZ_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 4173
CMD ["node", "server.cjs"]
