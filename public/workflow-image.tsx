import React from 'react';
import { 
  CloudUpload as UploadIcon,
  Loop as ProcessIcon,
  Share as ShareIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

export const WorkflowImage: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative h-full flex items-center justify-between">
        {/* Step 1: Upload */}
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center relative group transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-10 rounded-2xl group-hover:opacity-20" />
            <UploadIcon className="w-16 h-16 text-blue-500" />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Upload</p>
        </div>

        {/* Arrow 1 */}
        <ArrowIcon className="w-12 h-12 text-blue-400 mx-4" />
        
        {/* Step 2: Process */}
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center relative group transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-10 rounded-2xl group-hover:opacity-20" />
            <ProcessIcon className="w-16 h-16 text-purple-500" />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Process</p>
        </div>

        {/* Arrow 2 */}
        <ArrowIcon className="w-12 h-12 text-blue-400 mx-4" />
        
        {/* Step 3: Share */}
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center relative group transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 opacity-10 rounded-2xl group-hover:opacity-20" />
            <ShareIcon className="w-16 h-16 text-indigo-500" />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Share</p>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-8 left-0 right-0">
        <div className="flex justify-between px-12">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Secure Upload</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Real-time Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Instant Sharing</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 