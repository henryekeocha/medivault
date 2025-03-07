'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const HeroImage: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30" />
      
      {/* Medical Image Viewer Interface */}
      <motion.div 
        className="absolute inset-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Toolbar */}
        <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600 flex items-center px-4 gap-4">
          <motion.div 
            className="w-3 h-3 rounded-full bg-red-500"
            whileHover={{ scale: 1.2 }}
          />
          <motion.div 
            className="w-3 h-3 rounded-full bg-yellow-500"
            whileHover={{ scale: 1.2 }}
          />
          <motion.div 
            className="w-3 h-3 rounded-full bg-green-500"
            whileHover={{ scale: 1.2 }}
          />
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 bg-white dark:bg-gray-600 rounded text-sm text-gray-600 dark:text-gray-200 shadow">
              Patient_MRI_Scan.dcm
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-5 h-[calc(100%-3rem)]">
          {/* Left Sidebar */}
          <div className="col-span-1 border-r border-gray-200 dark:border-gray-600 p-4">
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700" />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Main Image Area */}
          <div className="col-span-3 p-4">
            <motion.div 
              className="h-full bg-black rounded-lg overflow-hidden relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {/* Simulated MRI Scan */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900">
                <motion.div
                  className="absolute inset-0 bg-[url('/brain-scan.svg')] bg-center bg-no-repeat bg-contain opacity-75"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                
                {/* Scan Lines Animation */}
                <motion.div
                  className="absolute top-0 left-0 w-full h-1 bg-blue-400/30"
                  animate={{
                    y: ["0%", "100%", "0%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>

              {/* Measurement Overlay */}
              <motion.div
                className="absolute top-1/2 left-1/4 w-32 h-32 border-2 border-blue-400 rounded-lg"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="absolute -top-6 left-0 bg-blue-400 text-white text-xs px-2 py-1 rounded">
                  32.5 mm
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-1 border-l border-gray-200 dark:border-gray-600 p-4">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Tools */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Tools</div>
                {['Pan', 'Zoom', 'Measure', 'Annotate'].map((tool, i) => (
                  <motion.div
                    key={tool}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-pointer"
                    whileHover={{ scale: 1.02, backgroundColor: '#f3f4f6' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{tool}</span>
                  </motion.div>
                ))}
              </div>

              {/* Properties */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Properties</div>
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[
                    { label: 'Brightness', value: '75%' },
                    { label: 'Contrast', value: '60%' },
                    { label: 'Saturation', value: '85%' }
                  ].map((prop, i) => (
                    <div key={prop.label} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{prop.label}</span>
                        <span>{prop.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: prop.value }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <motion.div
        className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}; 