'use client';

import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';

export default function ClassroomModelSelectionTab() {
	const [selectedModel, setSelectedModel] = useState<string>('');
	const [modelParams, setModelParams] = useState({
		param1: 50,
		param2: 30,
		param3: 'Option 1'
	});

	const models = [
		{
			id: 'random-forest',
			name: 'Random Forest',
			description: 'Ensemble method using multiple decision trees. Excellent for tabular data and provides feature importance rankings.',
			best_for: 'High accuracy with interpretable results'
		},
		{
			id: 'gradient-boosting',
			name: 'Gradient Boosting',
			description: 'Sequential ensemble that builds models iteratively. Often achieves the highest accuracy on structured data.',
			best_for: 'Maximum predictive performance'
		},
		{
			id: 'neural-network',
			name: 'Neural Network',
			description: 'Deep learning model with multiple layers. Can capture complex non-linear patterns in astronomical data.',
			best_for: 'Complex pattern recognition'
		},
		{
			id: 'svm',
			name: 'Support Vector Machine',
			description: 'Finds optimal decision boundary using support vectors. Works well with high-dimensional feature spaces.',
			best_for: 'High-dimensional data classification'
		}
	];

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
					
					{/* Model Selection - Active */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
							<span className="text-sm font-bold">2</span>
						</div>
						<span className="ml-2 text-sm font-medium">Model Selection</span>
					</div>
					
					{/* Connector Line */}
					<div className="w-8 h-0.5 bg-[#E6E7E9]"></div>
					
					{/* Train & Validate - Upcoming */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-[#E6E7E9] text-gray-500 flex items-center justify-center">
							<span className="text-sm font-bold">3</span>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">Train & Validate</span>
					</div>
					
					{/* Connector Line */}
					<div className="w-8 h-0.5 bg-[#E6E7E9]"></div>
					
					{/* Test & Export - Upcoming */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-[#E6E7E9] text-gray-500 flex items-center justify-center">
							<span className="text-sm font-bold">4</span>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">Test & Export</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
			{/* Model Architecture Selection */}
			<div className="lg:col-span-6">
				<Card>
					<CardTitle>Model Architecture</CardTitle>
					<CardContent>
						<p className="mb-4">
							Select a machine learning model architecture for training. Each
							architecture has different strengths and is optimized for specific
							types of astronomical data and classification tasks.
						</p>

						{/* Model selection UI */}
						<div className="space-y-4 mt-6">
							{models.map((model) => (
								<div
									key={model.id}
									onClick={() => setSelectedModel(model.id)}
									className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
										selectedModel === model.id
											? 'border-black bg-[#F9F9F9] shadow-md'
											: 'border-[#AFAFAF] hover:border-gray-400 hover:bg-[#F9F9F9]'
									}`}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center">
												<input
													type="radio"
													checked={selectedModel === model.id}
													readOnly
													className="mr-3"
												/>
												<h3 className="font-semibold text-lg">{model.name}</h3>
											</div>
											<p className="text-sm mt-2 text-gray-600 ml-6">
												{model.description}
											</p>
											<div className="mt-2 ml-6">
												<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
													💡 {model.best_for}
												</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Model Parameters */}
			<div className="lg:col-span-6">
				<Card>
					<CardTitle>Model Parameters</CardTitle>
					<CardContent>
						<p className="mb-4">
							Configure the hyperparameters for your selected model
							architecture. These settings will affect model performance,
							training time, and generalization capability.
						</p>

						{/* Model parameters UI */}
						{selectedModel ? (
							<div className="space-y-4 mt-6">
								<div className="space-y-2">
									<label className="block text-sm font-medium">Number of Trees/Estimators</label>
									<div className="flex items-center space-x-3">
										<input 
											type="range" 
											min="10" 
											max="200" 
											value={modelParams.param1}
											onChange={(e) => setModelParams(prev => ({...prev, param1: parseInt(e.target.value)}))}
											className="flex-1" 
										/>
										<span className="w-12 text-right text-sm">{modelParams.param1}</span>
									</div>
								</div>

								<div className="space-y-2">
									<label className="block text-sm font-medium">Max Depth</label>
									<div className="flex items-center space-x-3">
										<input 
											type="range" 
											min="3" 
											max="20" 
											value={modelParams.param2}
											onChange={(e) => setModelParams(prev => ({...prev, param2: parseInt(e.target.value)}))}
											className="flex-1" 
										/>
										<span className="w-12 text-right text-sm">{modelParams.param2}</span>
									</div>
								</div>

								<div className="space-y-2">
									<label className="block text-sm font-medium">Feature Selection</label>
									<select 
										className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9]"
										value={modelParams.param3}
										onChange={(e) => setModelParams(prev => ({...prev, param3: e.target.value}))}
									>
										<option value="auto">Auto (sqrt of features)</option>
										<option value="log2">Log2 of features</option>
										<option value="all">All features</option>
									</select>
								</div>

								<div className="mt-4 p-3 bg-blue-50 rounded-lg">
									<h4 className="text-sm font-medium text-blue-800 mb-1">Configuration Summary</h4>
									<p className="text-xs text-blue-700">
										{selectedModel === 'random-forest' ? 'Random Forest' :
										 selectedModel === 'gradient-boosting' ? 'Gradient Boosting' :
										 selectedModel === 'neural-network' ? 'Neural Network' :
										 selectedModel === 'svm' ? 'Support Vector Machine' : 'Model'} 
										with {modelParams.param1} estimators, max depth {modelParams.param2}, using {modelParams.param3} feature selection.
									</p>
								</div>
							</div>
						) : (
							<div className="mt-6 p-8 bg-gray-50 rounded-lg text-center">
								<p className="text-gray-600">Select a model architecture to configure parameters</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Performance Metrics */}
			<div className="lg:col-span-12">
				<Card>
					<CardTitle>Expected Performance Metrics</CardTitle>
					<CardContent>
						<p className="text-sm mb-4">
							Based on your selected model and parameters, these are the
							expected performance metrics on similar datasets.
						</p>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
							<div className="bg-[#F9F9F9] p-4 rounded-xl">
								<h4 className="font-medium">Accuracy</h4>
								<div className="text-2xl font-bold mt-2">94%</div>
							</div>

							<div className="bg-[#F9F9F9] p-4 rounded-xl">
								<h4 className="font-medium">Training Time</h4>
								<div className="text-2xl font-bold mt-2">~3 min</div>
							</div>

							<div className="bg-[#F9F9F9] p-4 rounded-xl">
								<h4 className="font-medium">F1 Score</h4>
								<div className="text-2xl font-bold mt-2">0.92</div>
							</div>
						</div>

						{/* Visualization placeholder */}
						<div className="mt-6 bg-[#D9D9D9] h-[200px] flex items-center justify-center">
							<p className="text-gray-600">
								Performance metrics visualization placeholder
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			</div>
			
			{/* Next Button */}
			<div className="fixed bottom-8 right-8 z-10">
				{selectedModel ? (
					<Link
						href="/dashboard/classroom/train-validate"
						className="bg-black text-white rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg hover:bg-gray-800 transition-colors"
					>
						Train Model
						<svg
							className="w-7 h-7 ml-2"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
								clipRule="evenodd"
							/>
						</svg>
					</Link>
				) : (
					<div className="bg-gray-400 text-white rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg cursor-not-allowed">
						<span>Select Model First</span>
						<svg
							className="w-7 h-7 ml-2 opacity-50"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
				)}
			</div>
		</div>
	);
}
