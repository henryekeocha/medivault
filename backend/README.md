# Medical Image Sharing Backend

A secure and scalable backend service for medical image sharing and collaboration.

## Features

- 🔐 Secure user authentication with JWT and 2FA
- 📊 Role-based access control (Patient, Provider, Admin)
- 🖼️ Medical image upload and management
- 🔗 Secure image sharing with expiring links
- 💬 In-app messaging system
- 📝 Image annotations
- 📈 Audit logging
- ⚙️ System settings management
- 📊 Storage statistics and monitoring

## Tech Stack

- Node.js (>= 18.0.0)
- TypeScript
- Express.js
- PostgreSQL
- TypeORM
- AWS S3 for image storage
- Jest for testing

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL
- AWS Account with S3 access
- SMTP server for email notifications

## Environment Setup

Create the following environment files:

### Development (.env.development)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/medical_images_dev
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=90d
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@example.com
```

### Production (.env.production)
Similar to development but with production values.

### Test (.env.test)
Similar to development but with test database and mock services.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run database migrations:
   ```bash
   npm run typeorm:migration:run
   ```
4. (Optional) Seed the database:
   ```bash
   npm run seed
   ```

## Development

Start the development server:
```bash
npm run dev
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## API Documentation

API documentation is available at `/api-docs` when the server is running. It includes:
- Authentication endpoints
- User management
- Image operations
- Messaging system
- Audit logs
- System settings

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set up production environment variables

3. Run database migrations:
   ```bash
   npm run typeorm:migration:run
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Security Features

- JWT authentication
- Two-factor authentication
- Password complexity requirements
- Rate limiting
- CORS protection
- Audit logging
- Secure file upload validation
- Expiring share links

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For support, email support@example.com or create an issue in the repository.