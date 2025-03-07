#!/usr/bin/env node

/**
 * Responsive Design Check Script
 * 
 * This script analyzes React components to identify potential responsive design issues.
 * It looks for components that may not be properly responsive by checking for:
 * 1. Missing responsive Grid props
 * 2. Fixed width/height values without responsive alternatives
 * 3. Components that might need responsive handling
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.blue('Starting responsive design check...'));
console.log(chalk.blue('==============================='));

// Get all TSX files in the src directory
const srcPath = path.join(__dirname, '..', 'src');

function findTsxFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsxFilesRecursively(filePath, fileList);
    } else if (/\.tsx$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const files = findTsxFilesRecursively(srcPath);
console.log(chalk.blue(`Found ${files.length} React component files to check`));

// Patterns to check for potential responsive issues
const RESPONSIVE_CHECKS = [
  {
    name: 'Fixed width values',
    regex: /width:\s*['"]?\d+px['"]?/g,
    severity: 'high'
  },
  {
    name: 'Fixed height values',
    regex: /height:\s*['"]?\d+px['"]?/g,
    severity: 'high'
  },
  {
    name: 'MUI Grid without responsive props',
    regex: /<Grid\s+item(?![^>]*xs)/g,
    severity: 'medium'
  },
  {
    name: 'MUI Typography without responsive variant',
    regex: /<Typography(?![^>]*variant)/g,
    severity: 'medium'
  },
  {
    name: 'Fixed position elements',
    regex: /position:\s*['"]?fixed['"]?/g,
    severity: 'medium'
  },
  {
    name: 'MUI Dialog without fullWidth prop',
    regex: /<Dialog(?![^>]*fullWidth)/g,
    severity: 'low'
  },
  {
    name: 'MUI Table without responsive container',
    regex: /<Table(?![^>]*useMediaQuery)/g,
    severity: 'low'
  }
];

// Track issues found
let totalIssuesFound = 0;

// Check each file for responsive design issues
files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.relative(path.join(__dirname, '..'), filePath);
  let fileIssuesFound = 0;
  
  RESPONSIVE_CHECKS.forEach(check => {
    const matches = content.match(check.regex);
    
    if (matches) {
      if (fileIssuesFound === 0) {
        console.log(chalk.yellow(`\nFile: ${fileName}`));
      }
      
      const severityColor = 
        check.severity === 'high' ? chalk.red :
        check.severity === 'medium' ? chalk.yellow :
        chalk.blue;
      
      console.log(severityColor(`  - [${check.severity.toUpperCase()}] Found ${matches.length} potential issues: ${check.name}`));
      
      // List some context for each occurrence
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.match(check.regex)) {
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
  console.log(chalk.green('\n✓ No potential responsive design issues found!'));
} else {
  console.log(chalk.yellow(`\n! Found ${totalIssuesFound} potential responsive design issues that should be reviewed.`));
  console.log(chalk.yellow(`  Note: These are only suggestions and may include false positives.`));
  console.log(chalk.yellow(`  Manual review of each issue is recommended.`));
}

console.log(chalk.blue('\nResponsive design check completed.'));

// Don't exit with error code since these are warnings
process.exit(0); 