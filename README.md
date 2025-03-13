# Medical Image Sharing Platform

A comprehensive platform for secure sharing, viewing, and collaborating on medical imaging data.

## Overview

This application provides a secure environment for healthcare providers to share medical images with patients and colleagues. It features a Next.js frontend and an Express.js backend, with PostgreSQL as the database.

## Features

- **Secure Authentication**: Role-based access control for patients, providers, and administrators
- **Image Sharing**: Upload, view, and share medical images with specific users
- **Collaboration**: Add annotations and comments to medical images
- **Real-time Updates**: Get notifications when new images are shared with you
- **Privacy Focused**: Compliant with healthcare data security standards

## Architecture

The application consists of three main components:

1. **Frontend**: Next.js application with TypeScript, providing a responsive user interface
2. **Backend**: Express.js API with TypeScript, handling business logic and data access
3. **Database**: PostgreSQL database for persistent storage

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- PostgreSQL 15 or later

### Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/username/medical-image-sharing-platform.git
cd medical-image-sharing-platform
```

2. **Set up the backend**

```bash
cd backend
npm install
cp .env.example .env  # Configure your environment variables
npm run prisma:migrate
npm run seed  # Optional: populate with test data
npm run dev
```

3. **Set up the frontend**

```bash
cd medical-image-sharing
npm install
cp .env.example .env  # Configure your environment variables
npm run dev
```

4. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## Docker Deployment

For production deployment, we recommend using Docker and Docker Compose. See the [Docker Guide](DOCKER-GUIDE.md) for detailed instructions.

Quick start:

```bash
docker compose up -d
```

## Testing

Run tests for the backend:

```bash
cd backend
npm test
```

Run tests for the frontend:

```bash
cd medical-image-sharing
npm test
```

## Configuration

### Backend Environment Variables

- `NODE_ENV`: Environment (development, test, production)
- `PORT`: API server port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGIN`: Allowed origins for CORS
- `JWT_SECRET`: Secret for JWT token generation
- `AWS_ACCESS_KEY_ID`: AWS access key for S3 storage
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for S3 storage
- `AWS_REGION`: AWS region for S3 bucket

### Frontend Environment Variables

- `NEXT_PUBLIC_API_URL`: URL of the backend API
- `NEXT_PUBLIC_WS_URL`: WebSocket URL for real-time features

## Project Structure

```
├── backend/                # Express.js backend
│   ├── prisma/             # Prisma ORM schema and migrations
│   ├── src/                # Source code
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── Dockerfile          # Docker configuration for backend
│   └── package.json        # Node.js dependencies
├── medical-image-sharing/  # Next.js frontend
│   ├── public/             # Static assets
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Next.js pages
│   │   ├── services/       # API service clients
│   │   └── styles/         # CSS and styling
│   ├── Dockerfile          # Docker configuration for frontend
│   └── package.json        # Node.js dependencies
├── docker-compose.yml      # Docker Compose configuration
└── README.md               # Project documentation
```

## User Credentials for Testing

After running the seed script, you can log in with these test accounts:

- **Admin**: Email: admin@medical-imaging.com, Password: admin123
- **Provider**: Email: provider@medical-imaging.com, Password: provider123
- **Patient**: Email: patient@medical-imaging.com, Password: patient123

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Project Link: https://github.com/username/medical-image-sharing-platform 