# DL Model External API Integration - Implementation Guide

## Overview
This implementation adds support for external API calls to `http://localhost:8000/api/dl/predict` for CNN and DNN deep learning models in the Exchron Dashboard. The API call is triggered when the "Evaluate" button is pressed after selecting a DL model and valid Kepler ID.

## Implementation Details

### 1. New API Route
**File:** `src/app/api/dl-predict/route.ts`

This route acts as a proxy between the frontend and the external DL prediction service:
- **Endpoint:** `POST /api/dl-predict`
- **External API:** `http://localhost:8000/api/dl/predict`
- **Purpose:** Handles CNN/DNN model predictions with validation and error handling

### 2. Request Format
The API accepts requests in the following format:
```json
{
  "model": "cnn",
  "kepid": "10000490", 
  "predict": true
}
```

### 3. Response Format
The external API returns:
```json
{
  "candidate_probability": 0.8764,
  "non_candidate_probability": 0.1236,
  "lightcurve_link": "https://archive.stsci.edu/missions/kepler/lightcurves/0100/010004908/kplr010004908-2009166043257_llc.fits",
  "target_pixel_file_link": "https://archive.stsci.edu/missions/kepler/target_pixel_files/0100/010004908/kplr010004908-2009166043257_lpd-targ.fits",
  "dv_report_link": "https://exoplanetarchive.ipac.caltech.edu/data/KeplerData/008/008358/008358421/dv/kplr008358421_20121029225749_dvr.pdf",
  "kepid": "10000490",
  "model_used": "CNN"
}
```

## User Flow

### 1. Model Selection (Overview Tab)
- User selects either `EXCHRON-CNN` or `EXCHRON-DNN` model
- Model selection is stored in localStorage
- Only these models support external API predictions

### 2. Data Input (Data Input Tab)
- For CNN/DNN models, only "Preloaded Data" mode is available
- User enters a valid Kepler ID from the allowed list
- Kepler ID is validated against CSV file `/public/CNN-DNN-allowed.csv`
- Valid Kepler ID is stored in sessionStorage

### 3. Prediction (Results Tab)
- Results tab detects if a DL model is selected and valid Kepler ID exists
- Shows a "Predict" button for CNN/DNN models
- When clicked, calls the external API through the internal proxy
- Displays prediction results with additional resource links

## Component Changes

### Modified Files:
1. **`src/components/dashboard/playground/results.tsx`**
   - Added DL model detection logic
   - Added "Predict" button for CNN/DNN models
   - Added API call functionality (currently using mock data for demo)
   - Added display of external API response data

2. **`src/components/dashboard/playground/datainput.tsx`**
   - Added Kepler ID storage to sessionStorage on evaluate

## Console Logging Demo

When a user selects a DL model, enters a valid Kepler ID, and clicks "Predict", the following will be logged to the console:

```
=== DL Prediction Demo ===
Request to external API (http://localhost:8000/api/dl/predict):
{
  "model": "cnn",
  "kepid": "10000490",
  "predict": true
}
Mock response from external API:
{
  "candidate_probability": 0.8764,
  "non_candidate_probability": 0.1236,
  "lightcurve_link": "https://archive.stsci.edu/missions/kepler/lightcurves/0100/010004908/kplr010004908-2009166043257_llc.fits",
  "target_pixel_file_link": "https://archive.stsci.edu/missions/kepler/target_pixel_files/0100/010004908/kplr010004908-2009166043257_lpd-targ.fits",
  "dv_report_link": "https://exoplanetarchive.ipac.caltech.edu/data/KeplerData/008/008358/008358421/dv/kplr008358421_20121029225749_dvr.pdf",
  "kepid": "10000490",
  "model_used": "CNN"
}
=== End Demo ===
```

## Testing the Implementation

### Prerequisites:
1. Next.js development server running
2. External API service running on `http://localhost:8000`

### Test Steps:
1. Navigate to `/dashboard/playground/overview`
2. Select either "EXCHRON-CNN" or "EXCHRON-DNN" model
3. Go to Data Input tab
4. Select "Preloaded Data" mode
5. Enter a valid Kepler ID (e.g., "10000490")
6. Click "Evaluate" to go to Results tab
7. Click the "Predict" button
8. Check browser console for demo logs
9. View prediction results in the UI

## Production Deployment

To enable real API calls:
1. Uncomment the actual fetch call in `results.tsx`
2. Comment out the mock result logic
3. Ensure external API service is running and accessible
4. Test end-to-end integration

## Error Handling

The implementation includes comprehensive error handling for:
- Missing required fields (model, kepid)
- Invalid model types
- External API timeouts (30s limit)
- Network connection issues
- Invalid response formats
- External API error responses

## Security Considerations

- API route validates input parameters
- Uses POST method with JSON payload
- Sets appropriate timeout limits
- Sanitizes error messages returned to client
- No sensitive data exposed in logs (beyond demo purposes)