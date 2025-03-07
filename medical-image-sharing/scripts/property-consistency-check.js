#!/usr/bin/env node

/**
 * Property Consistency Check Script
 * 
 * This script scans the codebase for inconsistent property naming,
 * particularly focusing on renamed properties that might have been missed
 * during refactoring.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define property name mappings (old to new)
const PROPERTY_MAPPINGS = {
  'doctorId': 'providerId',
  'datetime': 'scheduledFor',
  'appointments': 'items', // In the context of API responses
};

console.log(chalk.blue('Starting property consistency check...'));
console.log(chalk.blue('==============================='));

// Get all TypeScript and JavaScript files in the src directory
const srcPath = path.join(__dirname, '..', 'src');

function findFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFilesRecursively(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const files = findFilesRecursively(srcPath);
console.log(chalk.blue(`Found ${files.length} files to check`));

// Track issues found
let totalIssuesFound = 0;

// Check each file for old property names
files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.relative(path.join(__dirname, '..'), filePath);
  let fileIssuesFound = 0;
  
  Object.entries(PROPERTY_MAPPINGS).forEach(([oldProp, newProp]) => {
    // Look for the old property name
    // This is a simple check and might have false positives
    const regex = new RegExp(`\\b${oldProp}\\b`, 'g');
    const matches = content.match(regex);
    
    if (matches) {
      if (fileIssuesFound === 0) {
        console.log(chalk.yellow(`\nFile: ${fileName}`));
      }
      
      console.log(chalk.red(`  - Found ${matches.length} occurrences of '${oldProp}' (should be '${newProp}')`));
      
      // List some context for each occurrence
      const lines = content.split('\n');
      let lineNumber = 0;
      
      lines.forEach((line, index) => {
        if (line.match(regex)) {
          const context = line.trim();
          console.log(chalk.gray(`    Line ${index + 1}: ${context}`));
        }
      });
      
      fileIssuesFound += matches.length;
      totalIssuesFound += matches.length;
    }
  });
});

if (totalIssuesFound === 0) {
  console.log(chalk.green('\n✓ No property naming inconsistencies found!'));
} else {
  console.log(chalk.red(`\n✗ Found ${totalIssuesFound} property naming inconsistencies that need to be fixed.`));
}

console.log(chalk.blue('\nProperty consistency check completed.'));

// Exit with appropriate code
process.exit(totalIssuesFound > 0 ? 1 : 0); 