# MediVault - Medical Image Sharing Platform

MediVault is a secure platform for sharing and analyzing medical images, designed with HIPAA compliance in mind. It allows healthcare providers to securely upload, view, and share medical images with patients and other providers.

## Architecture

The application consists of two main components:

1. **Frontend**: Next.js React application
   - Located in `/medical-image-sharing`
   - Provides the user interface and client-side functionality

2. **Backend**: Node.js Express API
   - Located in `/backend`
   - Provides authentication, file storage, and data persistence

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- AWS account (for S3 storage)

### Setup and Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/medical-image-sharing.git
   cd medical-image-sharing
   ```

2. **Set up environment variables**

   Frontend:
   ```bash
   cd medical-image-sharing
   cp .env.development .env
   ```

   Backend:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

3. **Install dependencies**

   Frontend:
   ```bash
   cd medical-image-sharing
   npm install
   ```

   Backend:
   ```bash
   cd backend
   npm install
   ```

4. **Set up the database**

   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   npm run db:seed
   ```

5. **Start development servers**

   Frontend:
   ```bash
   cd medical-image-sharing
   npm run dev
   ```

   Backend:
   ```bash
   cd backend
   npm run dev
   ```

6. **Access the application**

   Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Configuration

The application supports multiple environments through environment files:

### Frontend Environment Files

- `.env.development` - For local development
- `.env.production` - For production deployment

You can switch between environments using:

```bash
# Switch to development environment
npm run use:dev

# Switch to production environment
npm run use:prod

# Start with specific environment
npm run dev:local    # Development with local backend
npm run build:prod   # Production build
```

### Key Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL for API requests (e.g., `http://localhost:3001/api`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (e.g., `ws://localhost:3001`) |
| `BACKEND_URL` | Backend server URL (e.g., `http://localhost:3001`) |
| `NEXTAUTH_URL` | NextAuth URL (matching your frontend URL) |
| `NEXT_PUBLIC_APP_URL` | Frontend application URL |

## Health Monitoring

You can check the health of all services using:

```bash
npm run health
```

For environment-specific health checks:

```bash
npm run health:dev    # Development environment
npm run health:prod   # Production environment
```

To view detailed health information in the browser, visit [http://localhost:3000/health](http://localhost:3000/health)

## API Documentation

The API documentation is available at [http://localhost:3001/api-docs](http://localhost:3001/api-docs) when running the backend server.

## Features

- Secure user authentication with JWT and optional 2FA
- Medical image upload and management
- Image sharing with customizable permissions
- AI-powered image analysis using OpenAI and HuggingFace models
- Real-time notifications
- Audit logging for HIPAA compliance
- Patient-provider messaging
- Appointment scheduling
- Administrative dashboard

## Technology Stack

- **Frontend**:
  - Next.js
  - React
  - Material UI
  - TailwindCSS
  - Axios
  - Socket.io Client

- **Backend**:
  - Node.js
  - Express
  - Prisma ORM
  - PostgreSQL
  - AWS S3 for storage
  - Socket.io for real-time features
  - OpenAI for image analysis
  - HuggingFace for additional AI services

## Deployment

The application can be deployed to AWS using the following services:

- EC2 or ECS for hosting the backend
- S3 + CloudFront for hosting the frontend
- RDS for PostgreSQL database
- S3 for file storage
- NextAuth.js for user authentication
- CloudWatch for logging and monitoring

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team at support@medivault.online. 