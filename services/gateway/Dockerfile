FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/gateway ./services/gateway

# Install gateway dependencies
WORKDIR /usr/src/app/services/gateway
RUN npm install

EXPOSE 5005
CMD ["npm", "start"]
