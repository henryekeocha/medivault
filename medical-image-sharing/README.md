# Medical Image Sharing Platform

A modern platform for securely sharing and analyzing medical imaging data between patients, providers, and specialists.

## Features

- **User Authentication**: Secure authentication powered by Clerk with role-based access control (Patient, Provider, Admin).
- **Appointment Management**: Schedule, view, and manage medical appointments.
- **Image Upload & Sharing**: Share medical images securely between patients and healthcare providers.
- **Image Analysis**: AI-assisted analysis of medical images.
- **Responsive Design**: Optimized for desktop and mobile devices.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Database (MongoDB or PostgreSQL)
- Clerk account for authentication

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/medical-image-sharing.git
   cd medical-image-sharing
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Copy the `.env.example` file to `.env` and fill in the required variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

## Quality Assurance Tools

We've implemented several QA tools to ensure code quality and consistency:

### Type Checking

Run TypeScript type checking to identify type errors:

```bash
npm run type-check
```

### Property Consistency Check

Check for consistent property naming (particularly for renamed properties):

```bash
npm run property-check
```

### Responsive Design Check

Identify potential responsive design issues in components:

```bash
npm run responsive-check
```

### Run All QA Checks

Run all QA checks at once:

```bash
npm run qa
```

## Testing Documentation

Comprehensive testing documentation is available in the `/testing` directory:

- `final-qa-checklist.md`: Complete QA checklist
- `browser-compatibility-testing.md`: Browser compatibility testing plan
- `appointment-functionality-testing.md`: Appointment system testing plan

## Project Structure

```
├── docs/                  # Documentation files
├── public/                # Static assets
├── scripts/               # Utility scripts
├── src/
│   ├── components/        # React components
│   │   ├── appointments/  # Appointment-related components
│   │   ├── auth/          # Authentication components
│   │   ├── common/        # Shared components
│   │   ├── images/        # Image-related components
│   │   └── layout/        # Layout components
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   │   └── api/           # API client and types
│   ├── pages/             # Page components
│   ├── styles/            # Global styles
│   └── types/             # TypeScript type definitions
├── testing/               # Testing documentation and plans
├── .env.example           # Example environment variables
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## Recent Updates

- Improved mobile responsiveness across all components
- Standardized property naming conventions
- Enhanced appointment booking interface
- Implemented comprehensive QA tools and testing documentation

## Best Practices

When working on this project, please follow these guidelines:

### Property Naming Conventions

We've standardized on the following property names:
- Use `providerId` instead of `doctorId`
- Use `scheduledFor` instead of `datetime`
- Use `items` instead of `appointments` in API responses

### Responsive Design Guidelines

- Always use responsive Grid properties (xs, sm, md, lg, xl)
- Avoid fixed width/height values
- Test UI on multiple screen sizes
- Use the responsive design check tool to identify issues
