FROM node:20-alpine

WORKDIR /usr/src/app

# Copy shared library first
COPY services/shared ./services/shared

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
RUN npm install

# Copy service code
WORKDIR /usr/src/app
COPY services/ai-service ./services/ai-service

# Install ai-service dependencies
WORKDIR /usr/src/app/services/ai-service
RUN npm install

EXPOSE 5008
CMD ["npm", "start"]
