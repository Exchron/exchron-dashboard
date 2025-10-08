# ML Models API Implementation

This document describes the implementation of ML model predictions (GB and SVM) for manual data input in the Exchron Dashboard.

## Overview

The implementation adds support for Gradient Boosting (GB) and Support Vector Machine (SVM) model predictions when users select manual data entry mode. The system integrates with an external ML API running on `localhost:8000`.

## Components

### 1. API Route: `/api/ml-predict`

**File**: `src/app/api/ml-predict/route.ts`

**Purpose**: Proxy API route that handles ML prediction requests and forwards them to the external ML service.

**Endpoint**: `POST /api/ml-predict`

**Request Format**:
```json
{
  "model": "gb" | "svm",
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
}
```

**Response Format**:
```json
{
  "candidate_probability": 0.9254,
  "non_candidate_probability": 0.0746
}
```

**Features**:
- Request validation for all required fields
- Model type validation (gb/svm only)
- Feature validation for all 14 required KOI parameters
- Error handling with detailed error messages
- 30-second timeout protection
- Connection error detection

### 2. Data Input Component Updates

**File**: `src/components/dashboard/playground/datainput.tsx`

**Changes**:
- Enhanced `handleEvaluate()` function to handle ML model predictions
- Added ML model type detection from localStorage
- Integrated slider values into API request format
- Added error handling specific to ML API calls
- Stores results in sessionStorage for results page

**Flow**:
1. User adjusts 14 parameter sliders
2. User clicks "Evaluate" button
3. System detects model type (GB/SVM)
4. Builds prediction payload from slider values
5. Makes API call to `/api/ml-predict`
6. Stores results and navigates to results page

### 3. Results Component Updates

**File**: `src/components/dashboard/playground/results.tsx`

**Changes**:
- Added support for displaying ML model results
- Enhanced model info section to show ML vs DL models
- Added input features display for ML models
- Added model summary section for ML results
- Maintains backward compatibility with DL model results

**Display Features**:
- Model type identification (GB/SVM/CNN/DNN)
- Data source indication (Manual Entry)
- Input features summary with values
- Key parameters highlighting
- Prediction probabilities display

## Required External Service

The implementation requires an external ML service running on `http://localhost:8000/api/ml/predict` that:

1. Accepts POST requests with the specified JSON format
2. Returns predictions in the expected response format
3. Supports both "gb" and "svm" model types
4. Handles the 14 KOI feature parameters

## Usage Instructions

### For Users:
1. Navigate to Dashboard → Playground → Data Input
2. Select "Manual Data Entry" mode
3. Ensure a GB or SVM model is selected in Overview tab
4. Adjust the 14 parameter sliders as needed
5. Click "Evaluate" to run prediction
6. View results in the Results tab

### For Developers:
1. Start the external ML service on localhost:8000
2. Run the Next.js development server
3. Test API route directly: `POST http://localhost:3000/api/ml-predict`
4. Monitor console logs for debugging information

## Error Handling

The system provides specific error messages for common issues:

- **Connection Errors**: Service unavailable messages
- **Timeout Errors**: Request timeout notifications  
- **Validation Errors**: Missing/invalid parameter feedback
- **API Errors**: Upstream service error details

## Testing

Use the provided test script `test-ml-api.js` to validate the API route functionality:

```javascript
// Run in browser console or Node.js environment
import testMLPrediction from './test-ml-api.js';
await testMLPrediction();
```

## Integration Notes

- Results are stored in sessionStorage for cross-tab communication
- Model type detection works with existing model selection system
- Backward compatible with existing DL model workflows
- Follows established error handling patterns
- Uses existing UI components and styling system

## Future Enhancements

Potential improvements:
- Batch prediction support for multiple parameter sets
- Real-time prediction as sliders are adjusted
- Parameter validation with range checking
- Model comparison features
- Export functionality for prediction results