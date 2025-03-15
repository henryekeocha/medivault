# MediVault Utilities

This directory contains various utility scripts for the MediVault application.

## Health Monitoring

The health monitoring utilities help you ensure that all components of the MediVault system are running properly.

### Check Health Script

The `check-health.js` script provides a command-line tool to check the health of all MediVault services (frontend and backend).

#### Usage

```bash
# Check health using default .env settings
npm run health

# Check health using development environment
npm run health:dev

# Check health using production environment
npm run health:prod

# Or run directly with specific environment
node scripts/check-health.js --env=development
```

#### What It Checks

- Frontend service health (availability and response time)
- Backend API health (availability and response time)
- Database connectivity
- Memory usage and system resources

#### Output

The script provides detailed output including:

- Status of each service (healthy/unhealthy)
- Response times
- Detailed status of subcomponents
- Troubleshooting tips if any service is unhealthy

## Environment Management

The `set-env.sh` script helps you switch between development and production environments.

### Usage

```bash
# Switch to development environment
npm run use:dev

# Switch to production environment
npm run use:prod
```

### What It Does

- Copies the appropriate `.env.{environment}` file to `.env`
- Displays the current environment configuration
- Provides helpful information about the services being used

## Other Utilities

- `type-check.js`: Runs TypeScript type checking on the codebase
- `property-check.js`: Ensures component properties are consistent
- `responsive-check.js`: Checks for responsive design issues

Run the full QA suite with:

```bash
npm run qa
``` 