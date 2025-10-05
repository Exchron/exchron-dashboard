// TypeScript interfaces for Exchron ML functionality
// Based on classroom-feature-spec.md Section 5

export type ColumnType =
	| 'numeric'
	| 'categorical'
	| 'boolean'
	| 'datetime'
	| 'text';

export interface RawDataset {
	name: string;
	originalCSV: string;
	rows: string[][]; // raw cells
	header: string[];
}

// Parsing diagnostics for transparency in tolerant ingestion
export interface ParseStats {
	delimiter: string;
	inconsistentRowsDropped: number;
	totalRowsBefore: number;
	totalRowsAfter: number;
}

export interface InferredColumnMeta {
	name: string;
	index: number;
	inferredType: ColumnType;
	uniqueValues?: string[];
	min?: number;
	max?: number;
	mean?: number;
	std?: number;
	missingCount: number;
}

export interface PreparedDataset {
	features: Float32Array; // flattened (row-major)
	featureMatrixShape: { rows: number; cols: number };
	featureNames: string[];
	target: Float32Array; // encoded target (binary 0/1 or one-hot later)
	targetType: 'binary' | 'multiclass' | 'regression';
	encodingMap: Record<string, string[]>; // columnName -> category list
}

export interface ModelConfigBase {
	id: string;
	type: 'logistic' | 'neuralnet' | 'decision-tree';
	createdAt: number;
	hyperparams: Record<string, number | string | boolean>;
}

export interface TrainingRun {
	modelConfig: ModelConfigBase;
	datasetRef: string; // dataset id
	status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
	epochsPlanned?: number;
	epochMetrics: Array<{
		epoch: number;
		loss: number;
		valLoss?: number;
		acc?: number;
		valAcc?: number;
	}>;
	finalMetrics?: EvaluationSummary;
	startedAt?: number;
	finishedAt?: number;
	errorMessage?: string;
}

export interface EvaluationSummary {
	accuracy: number;
	precision: number;
	recall: number;
	f1: number;
	auc?: number;
	confusionMatrix: number[][];
	classLabels: string[];
	threshold: number; // decision threshold used
}

export interface ExportArtifact {
	modelId: string;
	format: 'json-tfjs' | 'json-custom';
	blob: Blob;
	metadata: any;
}

// UI state interfaces
export interface DataInputState {
	selectedDataSource: 'kepler' | 'k2' | 'tess' | 'own';
	uploadedFile?: File;
	rawDataset?: RawDataset;
	columnMeta?: InferredColumnMeta[];
	targetColumn?: string;
	selectedFeatures?: string[];
	parseStats?: ParseStats; // diagnostics from last parse
	missingValueStrategy: Record<string, 'drop' | 'mean' | 'mode'>;
	normalization: boolean;
}

export interface ModelSelectionState {
	selectedModel?: ModelConfigBase;
	hyperparams: Record<string, any>;
}

export interface TrainingState {
	currentRun?: TrainingRun;
	isTraining: boolean;
	preparedDataset?: PreparedDataset;
}

export interface TestExportState {
	threshold: number;
	manualInputValues: Record<string, any>;
	batchTestFile?: File;
	exportFormat: 'json-custom' | 'json-tfjs';
}

// Classroom store state
export interface ClassroomState {
	dataInput: DataInputState;
	modelSelection: ModelSelectionState;
	training: TrainingState;
	testExport: TestExportState;
}

// Worker message types
export interface WorkerMessage {
	type: 'start' | 'stop' | 'status' | 'epoch' | 'complete' | 'error';
	payload?: any;
}

// UI Log Event for debugging
export interface UILogEvent {
	t: number;
	scope: string;
	msg: string;
	data?: any;
}
