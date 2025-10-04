// Training orchestrator for classroom ML pipeline
// TODO(ClassroomSpec:6.3) Orchestrate complete training pipeline

import { LogisticRegression, LogisticRegressionConfig, TrainingMetrics } from '../models/logistic';
import { DataPreprocessor, PreprocessingConfig } from './encoding';

// Temporary types - will be replaced when imports are fixed
type RawDataset = {
  name: string;
  originalCSV: string;
  rows: string[][];
  header: string[];
};

type InferredColumnMeta = {
  name: string;
  index: number;
  inferredType: 'numeric' | 'categorical' | 'boolean' | 'datetime' | 'text';
  uniqueValues?: string[];
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  missingCount: number;
};

export interface TrainingConfig {
  modelType: 'logistic' | 'neuralnet';
  preprocessing: PreprocessingConfig;
  hyperparams: LogisticRegressionConfig;
}

export interface TrainingResult {
  model: any;
  trainMetrics: TrainingMetrics;
  valMetrics: TrainingMetrics;
  trainingHistory: TrainingMetrics[];
  encodingInfo: any[];
}

export class Trainer {
  
  /**
   * Train a model with the given configuration
   */
  static async trainModel(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: TrainingConfig,
    onProgress?: (metrics: TrainingMetrics) => void
  ): Promise<TrainingResult> {
    
    // Validate configuration
    this.validateConfig(config, columnMeta);
    
    // Prepare dataset
    console.log('Preparing dataset...');
    const { prepared, trainIndices, valIndices, encodingInfo } = DataPreprocessor.prepareDataset(
      rawDataset,
      columnMeta,
      config.preprocessing
    );
    
    // Split data
    const { trainX, trainY, valX, valY } = this.splitData(prepared, trainIndices, valIndices);
    
    console.log(`Training with ${trainIndices.length} samples, validating with ${valIndices.length} samples`);
    
    // Train model based on type
    if (config.modelType === 'logistic') {
      return this.trainLogisticRegression(
        trainX, trainY, valX, valY,
        prepared.featureMatrixShape.cols,
        config.hyperparams,
        prepared.featureNames,
        encodingInfo,
        onProgress
      );
    }
    
    throw new Error(`Model type ${config.modelType} not implemented yet`);
  }
  
  /**
   * Train logistic regression model
   */
  private static async trainLogisticRegression(
    trainX: Float32Array,
    trainY: Float32Array,
    valX: Float32Array,
    valY: Float32Array,
    numFeatures: number,
    config: LogisticRegressionConfig,
    featureNames: string[],
    encodingInfo: any[],
    onProgress?: (metrics: TrainingMetrics) => void
  ): Promise<TrainingResult> {
    
    const model = new LogisticRegression(numFeatures, config, featureNames);
    
    const trainedModel = await model.train(
      trainX,
      trainY,
      trainX.length / numFeatures,
      numFeatures,
      {
        X: valX,
        y: valY,
        numSamples: valX.length / numFeatures
      },
      onProgress
    );
    
    // Get final metrics
    const trainMetrics = model.evaluate(trainX, trainY, trainX.length / numFeatures, numFeatures);
    const valMetrics = model.evaluate(valX, valY, valX.length / numFeatures, numFeatures);
    
    return {
      model: trainedModel,
      trainMetrics: {
        epoch: config.epochs,
        loss: trainMetrics.loss,
        acc: trainMetrics.accuracy
      },
      valMetrics: {
        epoch: config.epochs,
        loss: valMetrics.loss,
        acc: valMetrics.accuracy
      },
      trainingHistory: trainedModel.trainingHistory,
      encodingInfo
    };
  }
  
  /**
   * Split prepared data into train and validation sets
   */
  private static splitData(
    prepared: any,
    trainIndices: number[],
    valIndices: number[]
  ): {
    trainX: Float32Array;
    trainY: Float32Array;
    valX: Float32Array;
    valY: Float32Array;
  } {
    
    const numFeatures = prepared.featureMatrixShape.cols;
    const trainSize = trainIndices.length;
    const valSize = valIndices.length;
    
    // Create training set
    const trainX = new Float32Array(trainSize * numFeatures);
    const trainY = new Float32Array(trainSize);
    
    for (let i = 0; i < trainSize; i++) {
      const originalIdx = trainIndices[i];
      trainY[i] = prepared.target[originalIdx];
      
      for (let j = 0; j < numFeatures; j++) {
        trainX[i * numFeatures + j] = prepared.features[originalIdx * numFeatures + j];
      }
    }
    
    // Create validation set
    const valX = new Float32Array(valSize * numFeatures);
    const valY = new Float32Array(valSize);
    
    for (let i = 0; i < valSize; i++) {
      const originalIdx = valIndices[i];
      valY[i] = prepared.target[originalIdx];
      
      for (let j = 0; j < numFeatures; j++) {
        valX[i * numFeatures + j] = prepared.features[originalIdx * numFeatures + j];
      }
    }
    
    return { trainX, trainY, valX, valY };
  }
  
  /**
   * Validate training configuration
   */
  private static validateConfig(config: TrainingConfig, columnMeta: InferredColumnMeta[]): void {
    // Check target column exists
    const targetExists = columnMeta.some(col => col.name === config.preprocessing.targetColumn);
    if (!targetExists) {
      throw new Error(`Target column '${config.preprocessing.targetColumn}' not found in dataset`);
    }
    
    // Check feature columns exist
    for (const feature of config.preprocessing.selectedFeatures) {
      const featureExists = columnMeta.some(col => col.name === feature);
      if (!featureExists) {
        throw new Error(`Feature column '${feature}' not found in dataset`);
      }
    }
    
    // Check we have at least one feature
    if (config.preprocessing.selectedFeatures.length === 0) {
      throw new Error('At least one feature must be selected');
    }
    
    // Validate hyperparameters
    if (config.hyperparams.learningRate <= 0 || config.hyperparams.learningRate > 1) {
      throw new Error('Learning rate must be between 0 and 1');
    }
    
    if (config.hyperparams.epochs <= 0 || config.hyperparams.epochs > 10000) {
      throw new Error('Epochs must be between 1 and 10000');
    }
  }
  
  /**
   * Get default configuration for a model type
   */
  static getDefaultConfig(
    modelType: 'logistic' | 'neuralnet',
    datasetSize: number,
    numFeatures: number
  ): Partial<TrainingConfig> {
    
    if (modelType === 'logistic') {
      return {
        modelType: 'logistic',
        hyperparams: {
          learningRate: datasetSize < 1000 ? 0.01 : 0.001,
          epochs: Math.min(1000, Math.max(100, Math.floor(10000 / datasetSize))),
          regularization: 0.01,
          batchSize: Math.min(32, Math.max(1, Math.floor(datasetSize / 10))),
          earlyStoppingPatience: 20
        }
      };
    }
    
    return {};
  }
  
  /**
   * Estimate training time
   */
  static estimateTrainingTime(
    modelType: 'logistic' | 'neuralnet',
    datasetSize: number,
    numFeatures: number,
    epochs: number
  ): {
    estimatedSeconds: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    
    let opsPerSample = 0;
    
    if (modelType === 'logistic') {
      opsPerSample = numFeatures * 2; // Forward + backward pass
    }
    
    const totalOps = datasetSize * epochs * opsPerSample;
    const opsPerSecond = 100000; // Rough estimate for JavaScript
    
    const estimatedSeconds = Math.ceil(totalOps / opsPerSecond);
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (estimatedSeconds > 30) complexity = 'medium';
    if (estimatedSeconds > 120) complexity = 'high';
    
    return { estimatedSeconds, complexity };
  }
}