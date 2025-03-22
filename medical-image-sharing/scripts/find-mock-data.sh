#!/bin/bash
echo "Scanning for mock data and TODOs"
grep -r --include="*.ts" --include="*.tsx" "mock\|TODO\|fake\|stub\|placeholder\|dummy" src
