#!/usr/bin/env node

/**
 * Error monitoring script for the medical image sharing application
 * This script watches error logs and provides a summary of errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LOG_DIR = path.join(__dirname, '../logs');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const SUMMARY_INTERVAL = 60 * 1000; // 1 minute

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create or clear error log file
fs.writeFileSync(ERROR_LOG, '');

// Start the application with error output redirection
console.log('Starting server with error monitoring...');
const serverProcess = require('child_process').spawn(
  'node',
  ['--require=dotenv/config', '../dist/index.js'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  }
);

// Redirect stdout to console
serverProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

// Redirect stderr to error log and console
serverProcess.stderr.on('data', (data) => {
  const errorData = data.toString();
  process.stderr.write(errorData);
  fs.appendFileSync(ERROR_LOG, errorData);
});

// Error categories
const errorPatterns = {
  database: /prisma|database|connection|postgres/i,
  auth: /authentication|authorization|token|jwt|login|password/i,
  validation: /validation|invalid|zod|schema/i,
  file: /file|upload|s3|storage|image/i,
  network: /network|connection|timeout|websocket/i
};

// Periodically analyze error logs
function analyzeErrors() {
  try {
    if (!fs.existsSync(ERROR_LOG)) return;
    
    const logContent = fs.readFileSync(ERROR_LOG, 'utf8');
    if (!logContent.trim()) {
      console.log('\n[MONITOR] No errors detected in the last interval');
      return;
    }
    
    const errorLines = logContent.split('\n').filter(line => line.trim());
    const totalErrors = errorLines.length;
    
    // Count errors by category
    const categoryCounts = Object.keys(errorPatterns).reduce((acc, category) => {
      acc[category] = errorLines.filter(line => errorPatterns[category].test(line)).length;
      return acc;
    }, {});
    
    // Find the most frequent error
    let mostFrequentError = '';
    let maxCount = 0;
    const errorMessages = {};
    
    errorLines.forEach(line => {
      const match = line.match(/Error message: (.+)/);
      if (match && match[1]) {
        const message = match[1];
        errorMessages[message] = (errorMessages[message] || 0) + 1;
        if (errorMessages[message] > maxCount) {
          maxCount = errorMessages[message];
          mostFrequentError = message;
        }
      }
    });
    
    // Generate and print summary
    console.log('\n===== ERROR MONITORING SUMMARY =====');
    console.log(`Total errors in the last interval: ${totalErrors}`);
    console.log('Error categories:');
    Object.entries(categoryCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`  - ${category}: ${count} (${Math.round(count/totalErrors*100)}%)`);
      });
    
    if (mostFrequentError) {
      console.log(`Most frequent error: "${mostFrequentError}" (${maxCount} occurrences)`);
    }
    
    console.log('====================================\n');
    
    // Clear the log for the next interval
    fs.writeFileSync(ERROR_LOG, '');
  } catch (err) {
    console.error('Error analyzing logs:', err);
  }
}

// Start periodic analysis
setInterval(analyzeErrors, SUMMARY_INTERVAL);

console.log(`Error monitoring active. Summaries will be generated every ${SUMMARY_INTERVAL/1000} seconds.`);

// Handle script termination
process.on('SIGINT', () => {
  console.log('\nStopping error monitoring...');
  serverProcess.kill();
  process.exit();
}); 