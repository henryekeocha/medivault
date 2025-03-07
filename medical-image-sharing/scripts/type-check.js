#!/usr/bin/env node

/**
 * Type Check Script
 * 
 * This script runs the TypeScript compiler in noEmit mode to check for type errors
 * without generating output files. It provides a summary of errors and warnings.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue('Starting TypeScript type checking...'));
console.log(chalk.blue('==============================='));

try {
  // Run TypeScript in noEmit mode to check types without generating files
  const result = execSync('npx tsc --noEmit', { encoding: 'utf8' });
  
  console.log(chalk.green('✓ No TypeScript errors found!'));
  console.log(chalk.green('==============================='));
  
} catch (error) {
  // TypeScript found errors
  console.log(chalk.red('TypeScript errors found:'));
  console.log(chalk.red('==============================='));
  
  // Format and display the error output
  const errorOutput = error.stdout.toString();
  
  // Count the number of errors
  const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
  
  console.log(errorOutput);
  console.log(chalk.red(`===============================`));
  console.log(chalk.red(`Found ${errorCount} TypeScript errors.`));
  
  // Exit with error code
  process.exit(1);
}

console.log(chalk.blue('Type checking completed.')); 