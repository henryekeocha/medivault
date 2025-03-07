'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  animate?: boolean;
}

export function Skeleton({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '', 
  animate = true 
}: SkeletonProps) {
  return (
    <div
      className={`${width} ${height} ${className} bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden relative`}
    >
      {animate && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          animate={{
            translateX: ['0%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)'
          }}
        />
      )}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === lines - 1 ? 'w-4/5' : 'w-full'} 
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <Skeleton width="w-12" height="h-12" className="mb-4" />
      <Skeleton width="w-3/4" height="h-6" className="mb-3" />
      <SkeletonText lines={2} />
    </div>
  );
}

interface SkeletonGridProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function SkeletonGrid({ 
  columns = 4, 
  rows = 4, 
  className = '' 
}: SkeletonGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6 ${className}`}>
      {Array.from({ length: columns * rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonPageProps {
  className?: string;
}

export function SkeletonPage({ className = '' }: SkeletonPageProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton width="w-3/4" height="h-12" className="mx-auto" />
        <Skeleton width="w-2/3" height="h-6" className="mx-auto" />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Skeleton width="w-32" height="h-12" />
        <Skeleton width="w-32" height="h-12" />
      </div>

      {/* Content Grid */}
      <SkeletonGrid />

      {/* CTA Section */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 space-y-6">
        <Skeleton width="w-2/3" height="h-8" className="mx-auto" />
        <Skeleton width="w-1/2" height="h-6" className="mx-auto" />
        <div className="flex justify-center gap-4">
          <Skeleton width="w-32" height="h-12" />
          <Skeleton width="w-32" height="h-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAuthField() {
  return (
    <div className="space-y-2">
      <Skeleton width="w-24" height="h-5" className="mb-1" /> {/* Label */}
      <Skeleton height="h-10" className="rounded-lg" /> {/* Input field */}
    </div>
  );
}

export function SkeletonAuthForm({ isRegister = false }: { isRegister?: boolean }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Logo/Brand */}
      <div className="text-center space-y-2">
        <Skeleton width="w-16" height="h-16" className="mx-auto rounded-xl mb-4" />
        <Skeleton width="w-48" height="h-8" className="mx-auto" />
        <Skeleton width="w-64" height="h-5" className="mx-auto" />
      </div>

      {/* Form Fields */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 space-y-6">
        {/* Email Field */}
        <SkeletonAuthField />

        {/* Password Field */}
        <SkeletonAuthField />

        {/* Additional Register Fields */}
        {isRegister && (
          <>
            <SkeletonAuthField /> {/* Confirm Password */}
            <SkeletonAuthField /> {/* Full Name */}
            <div className="flex items-center gap-2 mt-4">
              <Skeleton width="w-5" height="h-5" className="rounded" /> {/* Checkbox */}
              <Skeleton width="w-full" height="h-4" /> {/* Terms text */}
            </div>
          </>
        )}

        {/* Submit Button */}
        <Skeleton height="h-11" className="rounded-lg mt-6" />

        {/* Divider */}
        <div className="relative my-6">
          <Skeleton height="h-px" className="my-4" />
          <Skeleton width="w-24" height="h-4" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-2" />
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton height="h-11" className="rounded-lg" />
          <Skeleton height="h-11" className="rounded-lg" />
        </div>

        {/* Bottom Link */}
        <div className="text-center mt-6">
          <Skeleton width="w-64" height="h-4" className="mx-auto" />
        </div>
      </div>
    </div>
  );
} 