# Medical Image Sharing Application: Docker Guide

This guide explains how to deploy the Medical Image Sharing application using Docker and Docker Compose. The setup includes containerized services for the database, backend, and frontend, ensuring a production-ready deployment.

## Prerequisites

- Docker Engine (version 20.10+)
- Docker Compose (version 2.0+)
- Git

## Production Setup with Docker Compose

This setup creates a complete application stack with separate containers for each component:

- PostgreSQL database
- Node.js Express backend
- Next.js frontend

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd medical-image-sharing-app
   ```

2. **Build and start the containers**:
   ```bash
   docker compose up -d
   ```
   This command builds all containers and starts them in detached mode.

3. **Access the application**:
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3005/api

### Configuration

The Docker Compose setup uses environment variables for configuration. Review and modify these settings in the `docker-compose.yml` file:

#### Database Configuration
```yaml
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
POSTGRES_DB: medical_imaging
```

#### Backend Configuration
```yaml
NODE_ENV: production
PORT: 3001
DATABASE_URL: postgresql://postgres:postgres@postgres:5432/medical_imaging?schema=public
CORS_ORIGIN: http://localhost:3002
FRONTEND_URL: http://localhost:3002
AWS_ACCESS_KEY_ID: "your-access-key"
AWS_SECRET_ACCESS_KEY: "your-secret-key"
AWS_REGION: "us-east-1"
COGNITO_USER_POOL_ID: "your-user-pool-id"
COGNITO_CLIENT_ID: "your-client-id"
```

#### Frontend Configuration
```yaml
NODE_ENV: production
NEXT_PUBLIC_API_URL: http://localhost:3005/api
NEXT_PUBLIC_WS_URL: ws://localhost:3005
NEXT_PUBLIC_AWS_REGION: "us-east-1"
```

### Managing the Application

**Stop the application**:
```bash
docker compose down
```

**Stop and remove volumes** (will delete database data):
```bash
docker compose down -v
```

**View logs**:
```bash
# All containers
docker compose logs

# Specific container
docker compose logs backend
```

## Troubleshooting

### Database Connection Issues

If the backend can't connect to the database:

1. Check if the PostgreSQL container is running:
   ```bash
   docker compose ps postgres
   ```

2. Verify database logs:
   ```bash
   docker compose logs postgres
   ```

3. Ensure the DATABASE_URL in the backend environment variables correctly points to the postgres service.

### Application Not Loading

If the frontend or backend isn't loading:

1. Check container status:
   ```bash
   docker compose ps
   ```

2. View service logs:
   ```bash
   docker compose logs frontend
   docker compose logs backend
   ```

3. Verify that ports are correctly mapped and not in use by other services.

## Data Persistence

The setup uses Docker volumes for data persistence:

- `postgres_data`: Stores PostgreSQL database files
- `backend_uploads`: Stores uploaded medical images

To backup these volumes:

```bash
docker run --rm -v medical-imaging-app_postgres_data:/source -v $(pwd)/backups:/backup alpine tar -czf /backup/postgres_backup.tar.gz -C /source .
```

## Updating the Application

To update to a new version:

1. Pull the latest code:
   ```bash
   git pull
   ```

2. Rebuild and restart containers:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

## Security Considerations

1. In production, change all default passwords and credentials.
2. Consider setting up SSL/TLS for secure communication.
3. Review and update the AWS credentials with proper IAM permissions.
4. Use Docker secrets or a separate .env file for sensitive information.

## Development vs. Production

This setup is intended for production use. For local development, you might want to:

1. Mount code volumes for live reloading
2. Enable development mode in the services
3. Expose additional debugging ports

## Additional Commands

**Rebuild a specific service**:
```bash
docker compose build backend
docker compose up -d backend
```

**Run database migrations manually**:
```bash
docker compose exec backend npx prisma migrate deploy
```

**Access database console**:
```bash
docker compose exec postgres psql -U postgres -d medical_imaging
``` 