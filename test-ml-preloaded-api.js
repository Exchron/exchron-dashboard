// Test script for ML preloaded prediction API
// This demonstrates how the API route will be called for preloaded datasets

const testMLPreloadedPrediction = async () => {
	// Test with Kepler dataset
	const keplerPayload = {
		"model": "gb",
		"datasource": "pre-loaded",
		"data": "kepler",
		"predict": true
	};

	console.log('Testing Kepler dataset prediction...');
	await makeRequest(keplerPayload);

	// Test with TESS dataset
	const tessPayload = {
		"model": "svm",
		"datasource": "pre-loaded",
		"data": "tess",
		"predict": true
	};

	console.log('\nTesting TESS dataset prediction...');
	await makeRequest(tessPayload);
};

const makeRequest = async (payload) => {
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
		console.log('ML Preloaded Prediction Result:', result);
		
		// Expected response format:
		// {
		//   "candidate_probability": 0.6128,
		//   "non_candidate_probability": 0.3872,
		//   "first": { "kepid": "10000001", "candidate_probability": 0.8765, "non_candidate_probability": 0.1235 },
		//   "second": { "kepid": "10000018", "candidate_probability": 0.2341, "non_candidate_probability": 0.7659 },
		//   ... (8 more individual predictions)
		// }
		
		// Verify structure
		if (result.candidate_probability && result.first && result.first.kepid) {
			console.log('✅ Response structure valid');
			console.log(`Average: ${(result.candidate_probability * 100).toFixed(1)}% candidate`);
			console.log(`First target (${result.first.kepid}): ${(result.first.candidate_probability * 100).toFixed(1)}% candidate`);
		} else {
			console.log('❌ Response structure invalid');
		}
		
	} catch (error) {
		console.error('Request failed:', error);
	}
};

// Example usage:
// testMLPreloadedPrediction();

export default testMLPreloadedPrediction;