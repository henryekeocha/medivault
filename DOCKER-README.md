# Medical Image Sharing Platform - Docker Guide

This guide explains how to build, run, and share the Medical Image Sharing Platform using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (latest version)
- [Docker Compose](https://docs.docker.com/compose/install/) (latest version)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd medical-image-sharing-platform
   ```

2. Start the application using Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Access the application:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:3001/api](http://localhost:3001/api)

4. To stop the application:
   ```bash
   docker compose down
   ```

## Docker Compose Components

Our Docker Compose setup includes the following services:

- **postgres**: PostgreSQL database for storing application data
- **db-init**: One-time initialization service that runs migrations and seeds the database
- **backend**: Node.js Express backend API service
- **frontend**: Next.js frontend application

## Environment Variables

The Docker Compose setup includes default environment variables for development. 
For production use, you should customize these variables.

### Important Environment Variables

#### Backend Service
- `NODE_ENV`: Set to 'production' for production environments
- `DATABASE_URL`: Connection string for PostgreSQL
- `CORS_ORIGIN`: URL of the frontend (for CORS)
- `FRONTEND_URL`: URL of the frontend

#### Frontend Service
- `NODE_ENV`: Environment mode ('development' or 'production')
- `NEXT_PUBLIC_API_URL`: URL of the backend API
- `NEXT_PUBLIC_WS_URL`: WebSocket URL for real-time features

For a complete list of environment variables, refer to the `.env.example` files in the backend and frontend directories.

## Building and Sharing Docker Images

### Building Images Manually

1. Build the backend image:
   ```bash
   docker build -t medical-imaging-backend:latest ./backend
   ```

2. Build the frontend image:
   ```bash
   docker build -t medical-imaging-frontend:latest ./medical-image-sharing
   ```

### Pushing to Docker Registry

To share your Docker images with others, push them to a Docker registry:

1. Tag your images with your registry information:
   ```bash
   docker tag medical-imaging-backend:latest <your-registry>/medical-imaging-backend:latest
   docker tag medical-imaging-frontend:latest <your-registry>/medical-imaging-frontend:latest
   ```

2. Push the images to the registry:
   ```bash
   docker push <your-registry>/medical-imaging-backend:latest
   docker push <your-registry>/medical-imaging-frontend:latest
   ```

## Data Persistence

The Docker Compose setup uses Docker volumes for data persistence:

- `postgres_data`: Stores the PostgreSQL database files
- `backend_uploads`: Stores files uploaded to the backend

## Troubleshooting

### Database Connection Issues
- Check that the PostgreSQL container is running: `docker ps`
- Verify the database connection environment variables in the backend service

### Application Not Loading
- Check container logs: `docker compose logs backend` or `docker compose logs frontend`
- Ensure all containers are running: `docker compose ps`

## Additional Commands

- To view logs for all services:
  ```bash
  docker compose logs -f
  ```

- To rebuild and restart a specific service:
  ```bash
  docker compose up -d --build backend
  ```

- To completely remove the containers, networks, and volumes:
  ```bash
  docker compose down -v
  ``` 