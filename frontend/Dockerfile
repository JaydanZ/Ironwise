# Base Image
FROM node:20-alpine

#ENV Vars - MUST BE LOADED THIS WAY DUE TO VITES HANDLING OF ENV VARS
ARG VITE_BACKEND_API_URL
ENV VITE_BACKEND_API_URL=$VITE_BACKEND_API_URL
ARG VITE_EXERCISE_ART_URL
ENV VITE_EXERCISE_ART_URL=$VITE_EXERCISE_ART_URL

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install
RUN pnpm add typescript

# Copy source code
COPY . .

# Build the app
RUN pnpm run build

# Install serve to run the built app
RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]