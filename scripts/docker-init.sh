#!/bin/sh

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=postgres psql -h postgres -U postgres -d postgres -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - executing database initialization"

# Navigate to backend directory
cd /app/backend

# Install dependencies
echo "Installing backend dependencies..."
npm install --quiet

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database if SEED_DATABASE is set to true
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding the database..."
  npx prisma db seed
else
  echo "Skipping database seeding."
fi

echo "Database initialization completed successfully." 