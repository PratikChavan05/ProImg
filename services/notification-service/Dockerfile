FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/notification-service ./services/notification-service

# Install notification-service dependencies
WORKDIR /usr/src/app/services/notification-service
RUN npm install

EXPOSE 5006
CMD ["npm", "start"]
