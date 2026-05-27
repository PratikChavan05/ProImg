FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/auth-service ./services/auth-service

# Install auth-service dependencies
WORKDIR /usr/src/app/services/auth-service
RUN npm install

EXPOSE 5001
CMD ["npm", "start"]
