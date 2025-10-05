# Exported Neural Network Models

This directory contains trained neural network models exported from the Exchron Dashboard.

## Model Structure

Each exported model consists of:

- `{model_name}.json` - TensorFlow.js model topology and configuration
- `{model_name}.weights.bin` - Model weights in binary format
- `{model_name}_metadata.json` - Training metadata including feature columns, target column, and statistics
- `{model_name}_summary.json` - Training summary with performance metrics

## Model Metadata

The metadata file contains important information for model deployment:

```json
{
  "featureColumns": ["feature1", "feature2", ...],
  "targetColumn": "target_variable",
  "labelEncoder": {"class1": 0, "class2": 1, ...},
  "featureStats": {
    "feature1": {"mean": 0.5, "std": 1.2},
    ...
  },
  "modelConfig": {
    "hiddenLayers": [64, 32],
    "learningRate": 0.001,
    "epochs": 50,
    "batchSize": 32
  },
  "trainingSummary": {
    "finalAccuracy": 0.85,
    "validationAccuracy": 0.82,
    ...
  }
}
```

## Loading Models

To load and use exported models:

### Using TensorFlow.js in Browser:

```javascript
const model = await tf.loadLayersModel('/path/to/model.json');
```

### Using TensorFlow.js in Node.js:

```javascript
const tf = require('@tensorflow/tfjs-node');
const model = await tf.loadLayersModel('file://path/to/model.json');
```

## Important Notes

- Models are normalized using training statistics stored in metadata
- Input features must match the exact order and names used during training
- Target predictions use the label encoder mapping in metadata
- Models are saved in TensorFlow.js format for cross-platform compatibility

## Model Versioning

Models are automatically timestamped when exported. It's recommended to:

- Keep metadata files with their corresponding models
- Document model performance and use cases
- Test models on held-out data before deployment
