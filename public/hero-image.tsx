import React from 'react';

export const HeroImage: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden">
      {/* Medical Image Viewer Interface */}
      <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Toolbar */}
        <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-t-lg px-4 flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        
        {/* Main Content */}
        <div className="flex h-[calc(100%-3rem)]">
          {/* Image View */}
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-full h-full relative">
                {/* Medical Image Simulation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 border-2 border-blue-500 rounded-lg opacity-50" />
                  <div className="absolute w-1/2 h-1/2 border-2 border-purple-500 rounded-full opacity-50" />
                </div>
                {/* Measurement Lines */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/2 left-1/4 w-1/2 h-px bg-blue-500 opacity-50" />
                  <div className="absolute top-1/4 left-1/2 w-px h-1/2 bg-blue-500 opacity-50" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="w-64 border-l border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="mt-2 h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              
              {/* Tools */}
              <div className="space-y-2">
                <div className="h-8 bg-blue-500 rounded-lg opacity-75" />
                <div className="h-8 bg-purple-500 rounded-lg opacity-75" />
                <div className="h-8 bg-indigo-500 rounded-lg opacity-75" />
              </div>
              
              {/* Measurements */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 