"use client";

import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';

export default function ClassroomTrainValidateTab() {
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  
  // Simulate starting training process
  const handleStartTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    
    // Simulate progress updates
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          return 100;
        }
        return prev + 5;
      });
    }, 500);
  };
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Workflow Navigation */}
      <div className="flex items-center justify-center w-full mb-2">
        <div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
          {/* Data Input - Completed */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500">Data Input</span>
          </div>
          
          {/* Connector Line */}
          <div className="w-8 h-0.5 bg-black"></div>
          
          {/* Model Selection - Completed */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500">Model Selection</span>
          </div>
          
          {/* Connector Line */}
          <div className="w-8 h-0.5 bg-black"></div>
          
          {/* Train & Validate - Active */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
              <span className="text-sm font-bold">3</span>
            </div>
            <span className="ml-2 text-sm font-medium">Train & Validate</span>
          </div>
          
          {/* Connector Line */}
          <div className="w-8 h-0.5 bg-black"></div>
          
          {/* Test & Export - Upcoming */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#E6E7E9] text-gray-500 flex items-center justify-center">
              <span className="text-sm font-bold">4</span>
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500">Test & Export</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Training Configuration */}
      <div className="lg:col-span-6">
        <Card>
          <CardTitle>Training Configuration</CardTitle>
          <CardContent>
            <p className="text-sm mb-4">
              Configure how your model will be trained. These settings affect model performance,
              training time, and how well your model generalizes to new data.
            </p>
            
            <div className="space-y-4 mt-6">
              {/* Training parameters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Training Epochs</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    defaultValue="20" 
                    className="flex-1" 
                  />
                  <span className="w-12 text-right">20</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Size</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="128" 
                    defaultValue="32" 
                    className="flex-1" 
                  />
                  <span className="w-12 text-right">32</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Learning Rate</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    defaultValue="30" 
                    className="flex-1" 
                  />
                  <span className="w-12 text-right">0.001</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Split</label>
                <select className="w-full p-2 border rounded bg-[#F9F9F9]">
                  <option>70% Training / 30% Validation</option>
                  <option>80% Training / 20% Validation</option>
                  <option>60% Training / 40% Validation</option>
                </select>
              </div>
              
              {/* Start Training button */}
              <button 
                onClick={handleStartTraining}
                disabled={isTraining}
                className={`w-full py-3 mt-4 rounded-lg font-semibold ${
                  isTraining 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isTraining ? 'Training in Progress...' : 'Start Training'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Training Progress */}
      <div className="lg:col-span-6">
        <Card>
          <CardTitle>Training Progress</CardTitle>
          <CardContent>
            <p className="text-sm mb-4">
              Monitor your model's training progress and performance metrics in real-time.
            </p>
            
            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm">Training Progress</span>
                <span className="text-sm font-medium">{trainingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-black h-4 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${trainingProgress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Performance metrics */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-1">Training Accuracy</h4>
                <p className="text-2xl font-bold">
                  {trainingProgress > 0 ? `${Math.min(90 + (trainingProgress / 10), 98).toFixed(1)}%` : '-'}
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-1">Validation Accuracy</h4>
                <p className="text-2xl font-bold">
                  {trainingProgress > 0 ? `${Math.min(85 + (trainingProgress / 20), 92).toFixed(1)}%` : '-'}
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-1">Training Loss</h4>
                <p className="text-2xl font-bold">
                  {trainingProgress > 0 ? (0.5 - (trainingProgress / 250)).toFixed(3) : '-'}
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-1">Validation Loss</h4>
                <p className="text-2xl font-bold">
                  {trainingProgress > 0 ? (0.6 - (trainingProgress / 300)).toFixed(3) : '-'}
                </p>
              </div>
            </div>
            
            {/* Training visualization placeholder */}
            <div className="mt-6 bg-[#D9D9D9] h-[200px] flex items-center justify-center">
              <p className="text-gray-600">
                {trainingProgress === 0 
                  ? 'Training visualization will appear here'
                  : 'Training progress visualization'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Next Button - only enabled when training is complete */}
      <div className="fixed bottom-8 right-8 z-10">
        <Link 
          href="/dashboard/classroom/test-export" 
          className={`bg-black text-white rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg ${
            trainingProgress < 100 ? 'opacity-50 pointer-events-none' : ''
          }`}
          onClick={(e) => trainingProgress < 100 && e.preventDefault()}
        >
          Test Model
          <svg className="w-7 h-7 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </div>
    </div>
  );
}