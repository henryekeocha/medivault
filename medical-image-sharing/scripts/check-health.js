#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * This script checks the health of the backend and frontend services
 * and reports back the status of each service.
 * 
 * Usage: 
 *   node check-health.js
 *   node check-health.js --env=production
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Process command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env=')) || '--env=development';
const envName = envArg.split('=')[1] || 'development';

// Load environment variables from the specified env file
let envPath = path.resolve(process.cwd(), '.env');
if (envName !== 'default') {
  const specificEnvPath = path.resolve(process.cwd(), `.env.${envName}`);
  if (fs.existsSync(specificEnvPath)) {
    envPath = specificEnvPath;
    console.log(chalk.blue(`Using environment: ${envName} (${envPath})`));
  } else {
    console.log(chalk.yellow(`Environment file for ${envName} not found, using default .env file`));
  }
}

// Load environment variables
dotenv.config({ path: envPath });

// Service endpoints
const services = [
  {
    name: 'Frontend',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    healthEndpoint: '/api/health'
  },
  {
    name: 'Backend API',
    url: process.env.BACKEND_URL || 'http://localhost:3001',
    healthEndpoint: '/health'
  }
];

// Function to check health of a service
async function checkHealth(service) {
  console.log(chalk.blue(`Checking ${service.name} at ${service.url}${service.healthEndpoint}...`));
  
  try {
    const startTime = Date.now();
    const response = await axios.get(`${service.url}${service.healthEndpoint}`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    const responseTime = Date.now() - startTime;
    
    const status = response.data?.status || 'unknown';
    const statusCode = response.status;
    
    if (statusCode >= 200 && statusCode < 300 && status === 'healthy') {
      console.log(chalk.green(`✓ ${service.name}: Healthy (${responseTime}ms)`));
      console.log(chalk.gray(`  - Status Code: ${statusCode}`));
      
      // Log additional service details if available
      if (response.data?.services) {
        Object.entries(response.data.services).forEach(([serviceName, serviceInfo]) => {
          const serviceStatus = serviceInfo.status === 'healthy' || 
                               serviceInfo.status === 'connected' ? 
                               chalk.green(serviceInfo.status) : 
                               chalk.red(serviceInfo.status);
          console.log(chalk.gray(`  - ${serviceName}: ${serviceStatus}`));
        });
      }
      
      return { service: service.name, healthy: true, responseTime, statusCode, details: response.data };
    } else {
      console.log(chalk.red(`✗ ${service.name}: Unhealthy (${responseTime}ms)`));
      console.log(chalk.gray(`  - Status Code: ${statusCode}`));
      console.log(chalk.gray(`  - Status: ${status}`));
      
      if (response.data?.error) {
        console.log(chalk.gray(`  - Error: ${response.data.error}`));
      }
      
      return { service: service.name, healthy: false, responseTime, statusCode, details: response.data };
    }
  } catch (error) {
    console.log(chalk.red(`✗ ${service.name}: Error connecting`));
    console.log(chalk.gray(`  - ${error.message}`));
    return { service: service.name, healthy: false, error: error.message };
  }
}

// Main function to check all services
async function checkAllServices() {
  console.log(chalk.cyan('┌─────────────────────────────────────┐'));
  console.log(chalk.cyan('│     MediVault Health Check Tool     │'));
  console.log(chalk.cyan('└─────────────────────────────────────┘'));
  console.log();
  
  const results = [];
  
  for (const service of services) {
    const result = await checkHealth(service);
    results.push(result);
    console.log(); // Add spacing between service checks
  }
  
  // Summary report
  console.log(chalk.cyan('┌─────────────────────────────────────┐'));
  console.log(chalk.cyan('│           Summary Report            │'));
  console.log(chalk.cyan('└─────────────────────────────────────┘'));
  
  const allHealthy = results.every(result => result.healthy);
  
  if (allHealthy) {
    console.log(chalk.green('All services are healthy! 🎉'));
  } else {
    console.log(chalk.yellow('Some services are unhealthy ⚠️'));
    
    const unhealthyServices = results.filter(result => !result.healthy);
    console.log(chalk.red(`Unhealthy services: ${unhealthyServices.map(s => s.service).join(', ')}`));
    
    // Provide troubleshooting tips
    console.log(chalk.cyan('\nTroubleshooting tips:'));
    if (unhealthyServices.some(s => s.service === 'Backend API')) {
      console.log(chalk.yellow('- Make sure the backend server is running:'));
      console.log(chalk.gray('  cd backend && npm run dev'));
    }
    if (unhealthyServices.some(s => s.service === 'Frontend')) {
      console.log(chalk.yellow('- Make sure the frontend server is running:'));
      console.log(chalk.gray('  npm run dev'));
    }
    console.log(chalk.yellow('- Check that environment variables are correctly set'));
    console.log(chalk.yellow('- Verify that the database is accessible'));
  }
  
  return { allHealthy, results };
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkAllServices().catch(error => {
    console.error(chalk.red('Error running health checks:'), error);
    process.exit(1);
  });
}

module.exports = { checkAllServices }; 