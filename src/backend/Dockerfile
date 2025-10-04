# Use an official Node runtime as a parent image
FROM node:22.14-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the app's source code to the working directory
COPY . .

# Expose the port that your app will run on
EXPOSE 5000