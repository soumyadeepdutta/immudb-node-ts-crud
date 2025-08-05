FROM node:22-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better caching and to ensure npm ci works
COPY package.json package-lock.json ./

# Install dependencies 
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
