FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/search-service ./services/search-service

# Install search-service dependencies
WORKDIR /usr/src/app/services/search-service
RUN npm install

EXPOSE 5007
CMD ["npm", "start"]
