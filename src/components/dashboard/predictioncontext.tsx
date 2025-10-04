'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// Prediction Context
// -------------------
// Provides shared state between Data Input (upload) and Results pages.
// Flow:
// 1. User selects Data Upload mode and chooses a CSV.
// 2. On Evaluate, CSV parsed to records -> POST http://localhost:8000/predict { records }
// 3. API expected to return an array (or {results: [...]}) where each element
//    has probability_confirmed and probability_false_positive (0..1 floats).
// 4. Results stored here and consumed in ResultsTab for display.
// If API shape changes, adapt the normalization logic in datainput.tsx.
// This context intentionally stays minimal (no persistence) to avoid stale data on refresh.
// Extend with caching / pagination if larger batch predictions are added.
// Types for model input and output
export interface ModelInputRecord {
	// Flexible shape: dynamic keys from CSV header
	[key: string]: string | number | null;
}

export interface ModelPredictionResult {
	// Some APIs return an object per row, others parallel arrays. We'll normalize.
	data?: unknown; // Raw data reference / id / row
	probability_confirmed: number;
	probability_false_positive: number;
	// Allow arbitrary passthrough fields (loosely typed)
	[key: string]: unknown;
}

type PredictionStatus = 'idle' | 'loading' | 'success' | 'error';

interface PredictionContextValue {
	status: PredictionStatus;
	error: string | null;
	inputRecords: ModelInputRecord[];
	predictions: ModelPredictionResult[];
	setLoading: () => void;
	setError: (msg: string) => void;
	setResults: (
		records: ModelInputRecord[],
		predictions: ModelPredictionResult[],
	) => void;
	reset: () => void;
}

const PredictionContext = createContext<PredictionContextValue | undefined>(
	undefined,
);

export const PredictionProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [status, setStatus] = useState<PredictionStatus>('idle');
	const [error, setErrorState] = useState<string | null>(null);
	const [inputRecords, setInputRecords] = useState<ModelInputRecord[]>([]);
	const [predictions, setPredictions] = useState<ModelPredictionResult[]>([]);

	const setLoading = useCallback(() => {
		setStatus('loading');
		setErrorState(null);
		setPredictions([]);
	}, []);

	const setError = useCallback((msg: string) => {
		setStatus('error');
		setErrorState(msg);
	}, []);

	const setResults = useCallback(
		(records: ModelInputRecord[], preds: ModelPredictionResult[]) => {
			setInputRecords(records);
			setPredictions(preds);
			setStatus('success');
			setErrorState(null);
		},
		[],
	);

	const reset = useCallback(() => {
		setStatus('idle');
		setErrorState(null);
		setInputRecords([]);
		setPredictions([]);
	}, []);

	return (
		<PredictionContext.Provider
			value={{
				status,
				error,
				inputRecords,
				predictions,
				setLoading,
				setError,
				setResults,
				reset,
			}}
		>
			{children}
		</PredictionContext.Provider>
	);
};

export function usePrediction() {
	const ctx = useContext(PredictionContext);
	if (!ctx)
		throw new Error('usePrediction must be used within a PredictionProvider');
	return ctx;
}
