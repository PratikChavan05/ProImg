FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/chat-service ./services/chat-service

# Install chat-service dependencies
WORKDIR /usr/src/app/services/chat-service
RUN npm install

EXPOSE 5003
CMD ["npm", "start"]
