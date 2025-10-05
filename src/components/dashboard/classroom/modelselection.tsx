'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import { classroomStore } from '../../../lib/ml/state/classroomStore';

export default function ClassroomModelSelectionTab() {
	// Model options (only NN fully enabled for now)
	const modelOptions = [
		{
			id: 'neural-network',
			name: 'Neural Network',
			description:
				'Deep learning with multiple hidden layers for complex pattern recognition.',
			comingSoon: false,
			icon: '🧠',
		},
		{
			id: 'random-forest',
			name: 'Random Forest',
			description:
				'Ensemble of decision trees. Great baseline for tabular feature importance.',
			comingSoon: true,
			icon: '🌳',
		},
		{
			id: 'svm',
			name: 'Support Vector Machine',
			description:
				'Max-margin classifier suitable for high-dimensional spaces.',
			comingSoon: true,
			icon: '📊',
		},
	];

	const [selectedModel, setSelectedModel] = useState<string>('neural-network');
	const [nnParams, setNnParams] = useState({
		hiddenLayers: '128,64,32',
		learningRate: 0.001,
		epochs: 100,
		batchSize: 32,
		dropoutRate: 0.3,
		validationSplit: 0.2,
	});

	// Persist hyperparams to store whenever they change
	useEffect(() => {
		classroomStore.setHyperparams({
			modelType: selectedModel,
			hiddenLayers: nnParams.hiddenLayers
				.split(',')
				.map((v) => parseInt(v.trim()))
				.filter((v) => !isNaN(v)),
			learningRate: nnParams.learningRate,
			epochs: nnParams.epochs,
			batchSize: nnParams.batchSize,
			dropoutRate: nnParams.dropoutRate,
			validationSplit: nnParams.validationSplit,
		});
	}, [nnParams, selectedModel]);

	return (
		<div className="grid grid-cols-1 gap-6">
			{/* Workflow Navigation */}
			<div className="flex items-center justify-center w-full mb-2">
				<div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
					{/* Data Input - Completed */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">
							Data Input
						</span>
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

					{/* Train & Validate - Upcoming (final step) */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-[#E6E7E9] text-gray-500 flex items-center justify-center">
							<span className="text-sm font-bold">3</span>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">
							Train & Validate
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Model Selection (Left) */}
				<div className="lg:col-span-4">
					<Card>
						<CardTitle>Select Model</CardTitle>
						<CardContent>
							<p className="text-sm mb-4">
								Choose a model architecture. Only Neural Network is currently
								available; others are coming soon.
							</p>
							<div className="space-y-3">
								{modelOptions.map((m) => {
									const selected = m.id === selectedModel;
									return (
										<label
											key={m.id}
											className={`block p-3 border rounded-lg cursor-pointer transition-all ${
												selected
													? 'border-black bg-[#F9F9F9]'
													: 'border-[#AFAFAF] hover:border-gray-400'
											}`}
										>
											<div className="flex items-start">
												<input
													type="radio"
													name="model"
													value={m.id}
													checked={selected}
													onChange={() =>
														!m.comingSoon && setSelectedModel(m.id)
													}
													className="mt-1 mr-3"
													disabled={m.comingSoon}
												/>
												<div className="flex-1">
													<div className="flex items-center">
														<span className="text-xl mr-2">{m.icon}</span>
														<h4 className="font-medium text-sm">{m.name}</h4>
														{m.comingSoon && (
															<span className="ml-2 text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
																Soon
															</span>
														)}
													</div>
													<p className="text-xs text-gray-600 mt-1 leading-snug">
														{m.description}
													</p>
												</div>
											</div>
										</label>
									);
								})}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Configuration (Right) */}
				<div className="lg:col-span-8">
					<Card>
						<CardTitle>
							{selectedModel === 'neural-network'
								? 'Neural Network Configuration'
								: 'Configuration'}
						</CardTitle>
						<CardContent>
							{selectedModel !== 'neural-network' && (
								<div className="p-8 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
									Configuration options will be available once this model type
									is implemented.
								</div>
							)}
							{selectedModel === 'neural-network' && (
								<>
									<p className="mb-4 text-sm">
										Configure the neural network hyperparameters. These settings
										affect learning dynamics, generalization, and training time.
									</p>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Hidden Layers (comma-separated)
											</label>
											<input
												type="text"
												value={nnParams.hiddenLayers}
												onChange={(e) =>
													setNnParams((p) => ({
														...p,
														hiddenLayers: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
												placeholder="128,64,32"
											/>
											<p className="text-xs text-gray-500">
												Units per layer. Example: 128,64,32
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Learning Rate
											</label>
											<input
												type="number"
												step="0.0001"
												min="0.0001"
												max="1"
												value={nnParams.learningRate}
												onChange={(e) =>
													setNnParams((p) => ({
														...p,
														learningRate: parseFloat(e.target.value),
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Epochs
											</label>
											<input
												type="number"
												min="1"
												max="1000"
												value={nnParams.epochs}
												onChange={(e) =>
													setNnParams((p) => ({
														...p,
														epochs: parseInt(e.target.value),
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Batch Size
											</label>
											<input
												type="number"
												min="1"
												max="512"
												value={nnParams.batchSize}
												onChange={(e) =>
													setNnParams((p) => ({
														...p,
														batchSize: parseInt(e.target.value),
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Dropout Rate
											</label>
											<input
												type="number"
												step="0.05"
												min="0"
												max="0.9"
												value={nnParams.dropoutRate}
												onChange={(e) =>
													setNnParams((p) => ({
														...p,
														dropoutRate: parseFloat(e.target.value),
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Validation Split
											</label>
											<input
												type="number"
												step="0.05"
												min="0.1"
												max="0.5"
												value={nnParams.validationSplit}
												onChange={(e) =>
													setNnParams((p) => ({
														...p,
														validationSplit: parseFloat(e.target.value),
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
										</div>
									</div>
									<div className="mt-6 p-4 bg-blue-50 rounded-lg text-xs text-blue-700">
										Hidden Layers: {nnParams.hiddenLayers} | LR:{' '}
										{nnParams.learningRate} | Epochs: {nnParams.epochs} | Batch:{' '}
										{nnParams.batchSize} | Dropout: {nnParams.dropoutRate} | Val
										Split: {nnParams.validationSplit}
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Next Button */}
			<div className="fixed bottom-8 right-8 z-10">
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
			</div>
		</div>
	);
}
