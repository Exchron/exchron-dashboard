// Client for calling backend Exoplanet FastAPI service
// Adjust BACKEND_BASE via env NEXT_PUBLIC_BACKEND_BASE if needed.

const BACKEND_BASE =
	process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:8000';

export interface BackendSinglePredictionResponse {
	model_name: string;
	prediction: number | null;
	probability: number | null; // probability of class 1 (without_exoplanet)
	confidence: number | null;
	label: string | null;
	threshold: number;
	error?: string | null;
}

export interface BackendBatchPredictionResponse {
	model_name: string;
	total_stars: number;
	successful: number;
	with_exoplanets: number;
	without_exoplanets: number;
	errors: number;
	predictions: BackendSinglePredictionResponse[];
}

export async function predictSingle(
	modelName: string,
	fluxValues: number[],
): Promise<BackendSinglePredictionResponse> {
	console.log(
		'[predictSingle] sending model=',
		modelName,
		'flux_len=',
		fluxValues.length,
	);
	const res = await fetch(`${BACKEND_BASE}/predict`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ model_name: modelName, flux_values: fluxValues }),
	});
	if (!res.ok) {
		let detail: any = undefined;
		try {
			detail = await res.json();
		} catch {}
		if (detail?.detail) {
			if (Array.isArray(detail.detail)) {
				const msgs = detail.detail.map((d: any) => d.msg || JSON.stringify(d));
				throw new Error(msgs.join('; '));
			}
			if (typeof detail.detail === 'string') throw new Error(detail.detail);
		}
		throw new Error(`Backend error (${res.status})`);
	}
	return res.json();
}

export async function predictBatch(
	modelName: string,
	stars: Array<{ flux_values?: number[]; kepid?: number }>,
): Promise<BackendBatchPredictionResponse> {
	console.log(
		'[predictBatch] sending model=',
		modelName,
		'stars=',
		stars.length,
	);
	const res = await fetch(`${BACKEND_BASE}/predict/batch`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ model_name: modelName, stars }),
	});
	if (!res.ok) {
		let detail: any = undefined;
		try {
			detail = await res.json();
		} catch {}
		if (detail?.detail) {
			if (Array.isArray(detail.detail)) {
				const msgs = detail.detail.map((d: any) => d.msg || JSON.stringify(d));
				throw new Error(msgs.join('; '));
			}
			if (typeof detail.detail === 'string') throw new Error(detail.detail);
		}
		throw new Error(`Backend error (${res.status})`);
	}
	return res.json();
}
