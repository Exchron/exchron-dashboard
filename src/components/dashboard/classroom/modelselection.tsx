'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import { classroomStore } from '../../../lib/ml/state/classroomStore';

export default function ClassroomModelSelectionTab() {
	// Model options
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
			comingSoon: false,
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
	
	// Initialize localStorage for global status display
	useEffect(() => {
		const modelData = modelOptions.find(m => m.id === selectedModel);
		if (modelData) {
			localStorage.setItem('selectedModel', JSON.stringify({
				id: modelData.id,
				name: modelData.name,
				short: modelData.name
			}));
		}
	}, [selectedModel]);
	// Store all hyperparameter inputs as strings to allow intermediary (empty / partial) edits without producing NaN warnings
	const [nnParams, setNnParams] = useState({
		hiddenLayers: '128,64,32',
		learningRate: '0.001',
		epochs: '100',
		batchSize: '32',
		dropoutRate: '0.3',
		validationSplit: '0.2',
	});

	// Random Forest hyperparameters
	const [rfParams, setRfParams] = useState({
		nEstimators: '100',
		maxDepth: '10',
		minSamplesSplit: '2',
		minSamplesLeaf: '1',
		maxFeatures: 'sqrt',
		bootstrap: 'true',
		randomState: '42',
	});

	// Persist hyperparams to store whenever they change
	useEffect(() => {
		if (selectedModel === 'neural-network') {
			// Parse numeric values safely; fallback to sensible defaults if invalid
			const hiddenLayers = nnParams.hiddenLayers
				.split(',')
				.map((v) => parseInt(v.trim()))
				.filter((v) => !isNaN(v) && v > 0);
			const learningRate = parseFloat(nnParams.learningRate);
			const epochs = parseInt(nnParams.epochs);
			const batchSize = parseInt(nnParams.batchSize);
			const dropoutRate = parseFloat(nnParams.dropoutRate);
			const validationSplit = parseFloat(nnParams.validationSplit);

			classroomStore.setHyperparams({
				modelType: selectedModel,
				hiddenLayers: hiddenLayers.length ? hiddenLayers : [128, 64, 32],
				learningRate:
					isFinite(learningRate) && learningRate > 0 ? learningRate : 0.001,
				epochs: isFinite(epochs) && epochs > 0 ? epochs : 100,
				batchSize: isFinite(batchSize) && batchSize > 0 ? batchSize : 32,
				dropoutRate:
					isFinite(dropoutRate) && dropoutRate >= 0 && dropoutRate < 1
						? dropoutRate
						: 0.3,
				validationSplit:
					isFinite(validationSplit) &&
					validationSplit >= 0.05 &&
					validationSplit <= 0.8
						? validationSplit
						: 0.2,
			});
		} else if (selectedModel === 'random-forest') {
			// Parse Random Forest hyperparameters
			const nEstimators = parseInt(rfParams.nEstimators);
			const maxDepth = parseInt(rfParams.maxDepth);
			const minSamplesSplit = parseInt(rfParams.minSamplesSplit);
			const minSamplesLeaf = parseInt(rfParams.minSamplesLeaf);
			const maxFeatures = isNaN(parseInt(rfParams.maxFeatures))
				? rfParams.maxFeatures
				: parseInt(rfParams.maxFeatures);
			const bootstrap = rfParams.bootstrap === 'true';
			const randomState = parseInt(rfParams.randomState);

			classroomStore.setHyperparams({
				modelType: selectedModel,
				nEstimators:
					isFinite(nEstimators) && nEstimators > 0 ? nEstimators : 100,
				maxDepth: isFinite(maxDepth) && maxDepth > 0 ? maxDepth : 10,
				minSamplesSplit:
					isFinite(minSamplesSplit) && minSamplesSplit >= 2
						? minSamplesSplit
						: 2,
				minSamplesLeaf:
					isFinite(minSamplesLeaf) && minSamplesLeaf >= 1 ? minSamplesLeaf : 1,
				maxFeatures: maxFeatures,
				bootstrap: bootstrap,
				randomState: isFinite(randomState) ? randomState : 42,
			});
		}
	}, [nnParams, rfParams, selectedModel]);

	return (
		<div className="grid grid-cols-1 gap-6">			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Model Selection (Left) */}
				<div className="lg:col-span-4">
					<Card>
						<CardTitle>Select Model</CardTitle>
						<CardContent>
							<p className="text-sm mb-4">
								Choose a model architecture for your machine learning task.
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
													onChange={() => {
														if (!m.comingSoon) {
															setSelectedModel(m.id);
															// Save to localStorage for global status display
															localStorage.setItem('selectedModel', JSON.stringify({
																id: m.id,
																name: m.name,
																short: m.name
															}));
														}
													}}
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
								: selectedModel === 'random-forest'
								? 'Random Forest Configuration'
								: 'Configuration'}
						</CardTitle>
						<CardContent>
							{selectedModel !== 'neural-network' &&
								selectedModel !== 'random-forest' && (
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
														learningRate: e.target.value,
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
														epochs: e.target.value,
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
														batchSize: e.target.value,
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
														dropoutRate: e.target.value,
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
														validationSplit: e.target.value,
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
							{selectedModel === 'random-forest' && (
								<>
									<p className="mb-4 text-sm">
										Configure the Random Forest hyperparameters. These settings
										control the ensemble behavior, tree complexity, and feature
										sampling.
									</p>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Number of Estimators
											</label>
											<input
												type="number"
												min="10"
												max="1000"
												value={rfParams.nEstimators}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														nEstimators: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
											<p className="text-xs text-gray-500">
												Number of trees in the forest
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Max Depth
											</label>
											<input
												type="number"
												min="1"
												max="50"
												value={rfParams.maxDepth}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														maxDepth: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
											<p className="text-xs text-gray-500">
												Maximum depth of trees
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Min Samples Split
											</label>
											<input
												type="number"
												min="2"
												max="20"
												value={rfParams.minSamplesSplit}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														minSamplesSplit: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
											<p className="text-xs text-gray-500">
												Min samples required to split
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Min Samples Leaf
											</label>
											<input
												type="number"
												min="1"
												max="10"
												value={rfParams.minSamplesLeaf}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														minSamplesLeaf: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
											<p className="text-xs text-gray-500">
												Min samples in leaf nodes
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Max Features
											</label>
											<select
												value={rfParams.maxFeatures}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														maxFeatures: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											>
												<option value="sqrt">sqrt</option>
												<option value="log2">log2</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
											</select>
											<p className="text-xs text-gray-500">
												Features to consider for splits
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Bootstrap
											</label>
											<select
												value={rfParams.bootstrap}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														bootstrap: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											>
												<option value="true">Yes</option>
												<option value="false">No</option>
											</select>
											<p className="text-xs text-gray-500">
												Use bootstrap sampling
											</p>
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium">
												Random State
											</label>
											<input
												type="number"
												min="0"
												max="999999"
												value={rfParams.randomState}
												onChange={(e) =>
													setRfParams((p) => ({
														...p,
														randomState: e.target.value,
													}))
												}
												className="w-full p-2 border border-[#AFAFAF] rounded bg-[#F9F9F9] text-sm"
											/>
											<p className="text-xs text-gray-500">
												Seed for reproducibility
											</p>
										</div>
									</div>
									<div className="mt-6 p-4 bg-green-50 rounded-lg text-xs text-green-700">
										Estimators: {rfParams.nEstimators} | Max Depth:{' '}
										{rfParams.maxDepth} | Min Split: {rfParams.minSamplesSplit}{' '}
										| Min Leaf: {rfParams.minSamplesLeaf} | Max Features:{' '}
										{rfParams.maxFeatures} | Bootstrap: {rfParams.bootstrap} |
										Random State: {rfParams.randomState}
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
