'use client';

import React from 'react';

function SkeletonTile() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="animate-pulse">
        {/* Icon Skeleton */}
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
        
        {/* Title Skeleton */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md mb-3 w-3/4" />
        
        {/* Description Skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Title Skeleton */}
        <div className="text-center mb-12">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mx-auto mb-6" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 mx-auto mb-8" />
            <div className="flex justify-center gap-4 mb-16">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-32" />
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-32" />
            </div>
          </div>
        </div>

        {/* 4x4 Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {Array.from({ length: 16 }).map((_, index) => (
            <SkeletonTile key={index} />
          ))}
        </div>

        {/* CTA Skeleton */}
        <div className="mt-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-2/3 mx-auto mb-4" />
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-lg w-1/2 mx-auto mb-8" />
            <div className="flex justify-center gap-4">
              <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl w-32" />
              <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 