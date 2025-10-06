// Classroom state management store
// Simple reactive store without external dependencies

import React from 'react';
import {
	ClassroomState,
	DataInputState,
	ModelSelectionState,
	TrainingState,
	TestExportState,
	RawDataset,
	InferredColumnMeta,
	PreparedDataset,
	TrainingRun,
	ParseStats,
} from '../../../types/ml';

type StateListener = (state: ClassroomState) => void;

class ClassroomStore {
	private state: ClassroomState;
	private listeners: Set<StateListener> = new Set();
	private readonly STORAGE_KEY = 'exchron.classroom.state';
	private hydratedFromStorage = false; // prevent multiple hydration attempts

	constructor() {
		this.state = this.getInitialState();
		// NOTE: We intentionally DO NOT hydrate from localStorage here.
		// Doing so would cause the first client render to differ from the
		// server-rendered HTML, leading to a React hydration warning when
		// persisted state (e.g., different selectedDataSource) changes the UI.
		// Hydration is now deferred until after mount via initFromStorage().
	}

	// Public method to hydrate from storage after the component has mounted
	initFromStorage() {
		if (this.hydratedFromStorage) return;
		if (typeof window === 'undefined' || typeof localStorage === 'undefined')
			return;
		const didLoad = this.loadFromStorage();
		this.hydratedFromStorage = true;
		if (didLoad) {
			// Notify subscribers so UI updates AFTER initial client render
			this.notify();
		}
	}

	private getInitialState(): ClassroomState {
		return {
			dataInput: {
				selectedDataSource: 'kepler',
				missingValueStrategy: {},
				normalization: true,
			},
			modelSelection: {
				hyperparams: {},
			},
			training: {
				isTraining: false,
				hasTrainedModel: false,
				trainedModel: undefined,
			},
			testExport: {
				threshold: 0.5,
				manualInputValues: {},
				exportFormat: 'json-custom',
				hasTestResults: false,
				testMetrics: undefined,
				confusionMatrix: undefined,
				rawProbabilities: undefined,
				rawTrueIndices: undefined,
				rocCurve: undefined,
				prCurve: undefined,
			},
		};
	}

	// State access
	getState(): ClassroomState {
		return { ...this.state };
	}

	// Subscribe to state changes
	subscribe(listener: StateListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	// Notify all listeners
	private notify() {
		this.listeners.forEach((listener) => listener(this.state));
		this.saveToStorage();
	}

	// Data Input actions
	setDataSource(source: DataInputState['selectedDataSource']) {
		const prev = this.state.dataInput.selectedDataSource;
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				selectedDataSource: source,
				// Reset dependent selections when dataset changes
				targetColumn: undefined,
				selectedFeatures: undefined,
				rawDataset: undefined,
				columnMeta: undefined,
				parseStats: undefined,
			},
		};
		// If dataset actually changed, clear training & test results
		if (source !== prev) {
			this.clearTraining();
			this.clearTestResults();
		}
		this.notify();
	}

	setUploadedFile(file: File) {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				uploadedFile: file,
			},
		};
		this.notify();
	}

	setRawDataset(
		dataset: RawDataset,
		columnMeta: InferredColumnMeta[],
		parseStats?: ParseStats,
	) {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				rawDataset: dataset,
				columnMeta: columnMeta,
				parseStats: parseStats ?? this.state.dataInput.parseStats,
			},
		};
		this.notify();
	}

	setParseStats(parseStats: ParseStats) {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				parseStats,
			},
		};
		this.notify();
	}

	setTargetColumn(columnName: string) {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				targetColumn: columnName,
			},
		};
		this.notify();
	}

	setSelectedFeatures(features: string[]) {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				selectedFeatures: features,
			},
		};
		this.notify();
	}

	setMissingValueStrategy(column: string, strategy: 'drop' | 'mean' | 'mode') {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				missingValueStrategy: {
					...this.state.dataInput.missingValueStrategy,
					[column]: strategy,
				},
			},
		};
		this.notify();
	}

	setNormalization(enabled: boolean) {
		this.state = {
			...this.state,
			dataInput: {
				...this.state.dataInput,
				normalization: enabled,
			},
		};
		this.notify();
	}

	// Model Selection actions
	setModelConfig(config: any) {
		this.state.modelSelection.selectedModel = config;
		this.notify();
	}

	setHyperparams(params: Record<string, any>) {
		this.state.modelSelection.hyperparams = {
			...this.state.modelSelection.hyperparams,
			...params,
		};
		this.notify();
	}

	// Training actions
	setPreparedDataset(dataset: PreparedDataset) {
		this.state.training.preparedDataset = dataset;
		this.notify();
	}

	setTrainingRun(run: TrainingRun) {
		this.state.training.currentRun = run;
		this.notify();
	}

	setTrainingStatus(isTraining: boolean) {
		this.state.training.isTraining = isTraining;
		this.notify();
	}

	setTestDataset(testData: {
		features: number[][];
		labels: number[];
		featureNames: string[];
		classLabels?: string[];
	}) {
		this.state.training.testDataset = testData;
		this.notify();
	}

	setHasTrainedModel(flag: boolean) {
		this.state.training.hasTrainedModel = flag;
		this.notify();
	}

	setTrainedModel(model: any) {
		this.state.training.trainedModel = model;
		this.notify();
	}

	updateTrainingMetrics(epoch: number, metrics: any) {
		if (this.state.training.currentRun) {
			this.state.training.currentRun.epochMetrics.push({
				epoch,
				...metrics,
			});
		}
		// Store raw numbers for calculations and formatted strings for display
		if (!this.state.training.trainingProgress) {
			this.state.training.trainingProgress = [];
		}
		const existingIndex = this.state.training.trainingProgress.findIndex(
			(m) => m.epoch === epoch,
		);
		const entry = {
			epoch,
			loss: metrics.loss || 0,
			accuracy: metrics.acc || metrics.accuracy || 0,
			valLoss: metrics.valLoss,
			valAccuracy: metrics.valAcc || metrics.valAccuracy,
		};
		if (existingIndex >= 0) {
			this.state.training.trainingProgress[existingIndex] = entry;
		} else {
			this.state.training.trainingProgress.push(entry);
		}
		// Update last progress timestamp for stall detection
		this.state.training.lastProgressAt = Date.now();
		this.notify();
	}

	setModelMetrics(metrics: any) {
		this.state.training.modelMetrics = metrics;
		this.notify();
	}

	clearTrainingProgress() {
		this.state.training.trainingProgress = [];
		this.state.training.modelMetrics = null;
		this.notify();
	}

	// Test & Export actions
	setThreshold(threshold: number) {
		this.state.testExport.threshold = threshold;
		this.notify();
	}

	setManualInputValue(field: string, value: any) {
		this.state.testExport.manualInputValues[field] = value;
		this.notify();
	}

	setBatchTestFile(file: File) {
		this.state.testExport.batchTestFile = file;
		this.notify();
	}

	setExportFormat(format: 'json-custom' | 'json-tfjs') {
		this.state.testExport.exportFormat = format;
		this.notify();
	}

	setTestResults(
		metrics: any,
		confusionMatrix?: number[][],
		artifacts?: {
			rawProbabilities?: number[][];
			rawTrueIndices?: number[];
			rocCurve?: {
				fpr: number[];
				tpr: number[];
				thresholds: number[];
				auc?: number;
			};
			prCurve?: { recall: number[]; precision: number[]; thresholds: number[] };
		},
	) {
		this.state.testExport.hasTestResults = true;
		this.state.testExport.testMetrics = metrics;
		this.state.testExport.confusionMatrix = confusionMatrix;
		if (artifacts) {
			this.state.testExport.rawProbabilities = artifacts.rawProbabilities;
			this.state.testExport.rawTrueIndices = artifacts.rawTrueIndices;
			this.state.testExport.rocCurve = artifacts.rocCurve;
			this.state.testExport.prCurve = artifacts.prCurve;
		}
		this.notify();
	}

	clearTestResults() {
		this.state.testExport.hasTestResults = false;
		this.state.testExport.testMetrics = undefined;
		this.state.testExport.confusionMatrix = undefined;
		this.state.testExport.rawProbabilities = undefined;
		this.state.testExport.rawTrueIndices = undefined;
		this.state.testExport.rocCurve = undefined;
		this.state.testExport.prCurve = undefined;
		this.notify();
	}

	// Persistence
	private saveToStorage() {
		try {
			if (typeof window === 'undefined' || typeof localStorage === 'undefined')
				return; // SSR guard
			// Don't save large binary data - only metadata
			const stateToSave = {
				...this.state,
				dataInput: {
					...this.state.dataInput,
					uploadedFile: undefined, // Don't save file objects
					rawDataset: this.state.dataInput.rawDataset
						? {
								...this.state.dataInput.rawDataset,
								originalCSV:
									this.state.dataInput.rawDataset.originalCSV.length > 50000
										? this.state.dataInput.rawDataset.originalCSV.substring(
												0,
												50000,
										  ) + '...[truncated]'
										: this.state.dataInput.rawDataset.originalCSV,
						  }
						: undefined,
				},
				training: {
					...this.state.training,
					preparedDataset: undefined, // Don't save large Float32Arrays
				},
				testExport: {
					...this.state.testExport,
					batchTestFile: undefined,
				},
			};

			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
		} catch (error) {
			console.warn('Failed to save classroom state to localStorage:', error);
		}
	}

	private loadFromStorage(): boolean {
		try {
			if (typeof window === 'undefined' || typeof localStorage === 'undefined')
				return false; // SSR guard
			const saved = localStorage.getItem(this.STORAGE_KEY);
			if (saved) {
				const parsedState = JSON.parse(saved);
				// Migration: remove deprecated data sources ('combined', 'k2')
				if (
					parsedState?.dataInput?.selectedDataSource === 'combined' ||
					parsedState?.dataInput?.selectedDataSource === 'k2'
				) {
					parsedState.dataInput.selectedDataSource = 'kepler';
				}
				// Merge but intentionally discard any persisted training & test progress so a refresh starts clean
				const {
					training: _ignoredTraining,
					testExport: _ignoredTest,
					...rest
				} = parsedState;
				this.state = {
					...this.state,
					...rest,
					training: this.getInitialState().training,
					testExport: this.getInitialState().testExport,
				};
				return true;
			}
			return false;
		} catch (error) {
			console.warn('Failed to load classroom state from localStorage:', error);
			return false;
		}
	}

	// Reset state
	reset() {
		this.state = this.getInitialState();
		if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
			localStorage.removeItem(this.STORAGE_KEY);
		}
		this.notify();
	}

	// Clear specific sections
	clearDataInput() {
		this.state.dataInput = {
			selectedDataSource: 'kepler',
			missingValueStrategy: {},
			normalization: true,
		};
		this.notify();
	}

	clearTraining() {
		this.state.training = {
			isTraining: false,
			hasTrainedModel: false,
			trainedModel: undefined,
			trainingProgress: [],
			modelMetrics: null,
			currentRun: undefined,
			preparedDataset: undefined,
			lastProgressAt: undefined,
			testDataset: undefined,
		};
		this.notify();
	}

	// Normalize inconsistent training state (e.g., app reloaded mid-training)
	ensureTrainingConsistency(maxStaleMs: number = 15000) {
		const t = this.state.training;
		if (!t.isTraining) return; // only act on active training
		const noProgress = !t.trainingProgress || t.trainingProgress.length === 0;
		const tooStale =
			!t.lastProgressAt || Date.now() - t.lastProgressAt > maxStaleMs;
		if (noProgress || tooStale) {
			// Consider it stale; reset isTraining flag but retain any partial metrics for inspection
			console.warn(
				'[ClassroomStore] Detected stale training state. Normalizing.',
			);
			t.isTraining = false;
			this.notify();
		}
	}
}

// Singleton instance
export const classroomStore = new ClassroomStore();

// React hook for component integration
export function useClassroomStore(): [ClassroomState, ClassroomStore] {
	const [state, setState] = React.useState(classroomStore.getState());

	React.useEffect(() => {
		// Defer localStorage hydration to after mount to prevent hydration mismatch
		classroomStore.initFromStorage();
		const unsubscribe = classroomStore.subscribe(setState);
		return unsubscribe;
	}, []);

	return [state, classroomStore];
}

// For non-React usage
export { ClassroomStore };
