// Test script for ML prediction API
// This demonstrates how the API route will be called

const testMLPrediction = async () => {
	const payload = {
		"model": "gb",
		"datasource": "manual",
		"features": {
			"koi_period": 10.00506974,
			"koi_time0bk": 136.83029,
			"koi_impact": 0.148,
			"koi_duration": 3.481,
			"koi_depth": 143.3,
			"koi_incl": 89.61,
			"koi_model_snr": 11.4,
			"koi_count": 2,
			"koi_bin_oedp_sig": 0.4606,
			"koi_steff": 5912,
			"koi_slogg": 4.453,
			"koi_srad": 0.924,
			"koi_smass": 0.884,
			"koi_kepmag": 14.634
		},
		"predict": true
	};

	try {
		const response = await fetch('/api/ml-predict', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('API Error:', error);
			return;
		}

		const result = await response.json();
		console.log('ML Prediction Result:', result);
		
		// Expected response format:
		// {
		//   "candidate_probability": 0.9254,
		//   "non_candidate_probability": 0.0746
		// }
		
	} catch (error) {
		console.error('Request failed:', error);
	}
};

// Example usage:
// testMLPrediction();

export default testMLPrediction;