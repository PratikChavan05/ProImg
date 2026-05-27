FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/pin-service ./services/pin-service

# Install pin-service dependencies
WORKDIR /usr/src/app/services/pin-service
RUN npm install

EXPOSE 5002
CMD ["npm", "start"]
