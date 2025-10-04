// Training orchestrator for classroom ML pipeline
// IMPLEMENTATION UPDATE: Complete training pipeline with progress tracking and validation

import { LogisticRegression, LogisticRegressionConfig, TrainingMetrics } from '../models/logistic';
import { DataPreprocessor, PreprocessingConfig } from './encoding';
import type { RawDataset, InferredColumnMeta, PreparedDataset } from '../../../types/ml';

export interface TrainingConfig {
  modelType: 'logistic' | 'neuralnet';
  preprocessing: PreprocessingConfig;
  hyperparams: LogisticRegressionConfig;
}

export interface TrainingResult {
  model: any;
  trainMetrics: TrainingMetrics;
  valMetrics: TrainingMetrics;
  testMetrics?: TrainingMetrics;
  trainingHistory: TrainingMetrics[];
  encodingInfo: any[];
  preprocessing: {
    removedFeatures: string[];
    missingValueStats: Record<string, { strategy: string; imputedCount: number }>;
    oneHotMapping?: Record<string, string[]>;
  };
  performance: {
    trainingTimeMs: number;
    samplesProcessed: number;
    epochsCompleted: number;
  };
}

export interface TrainingProgress {
  stage: 'preprocessing' | 'training' | 'validation' | 'complete';
  progress: number; // 0-1
  message: string;
  currentEpoch?: number;
  totalEpochs?: number;
  metrics?: TrainingMetrics;
}

export class Trainer {
  
  /**
   * Train a model with the given configuration
   * IMPLEMENTATION UPDATE: Enhanced with comprehensive progress tracking
   */
  static async trainModel(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: TrainingConfig,
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingResult> {
    
    const startTime = performance.now();
    
    // Report preprocessing stage
    onProgress?.({
      stage: 'preprocessing',
      progress: 0,
      message: 'Validating configuration...'
    });
    
    // Validate configuration
    this.validateConfig(config, columnMeta);
    
    onProgress?.({
      stage: 'preprocessing',
      progress: 0.2,
      message: 'Preparing dataset...'
    });
    
    // Prepare dataset with enhanced preprocessing
    const preprocessResult = DataPreprocessor.prepareDataset(
      rawDataset,
      columnMeta,
      config.preprocessing
    );
    
    const { prepared, trainIndices, valIndices, testIndices, encodingInfo, preprocessing } = preprocessResult;
    
    onProgress?.({
      stage: 'preprocessing',
      progress: 0.8,
      message: 'Splitting data...'
    });
    
    // Split data
    const { trainX, trainY, valX, valY, testX, testY } = this.splitDataEnhanced(
      prepared, trainIndices, valIndices, testIndices
    );
    
    console.log(`Training with ${trainIndices.length} samples, validating with ${valIndices.length} samples`);
    if (testIndices) {
      console.log(`Test set: ${testIndices.length} samples`);
    }
    
    onProgress?.({
      stage: 'training',
      progress: 0,
      message: 'Starting model training...',
      currentEpoch: 0,
      totalEpochs: config.hyperparams.epochs
    });
    
    // Enhanced progress callback for training
    const trainingProgressCallback = (metrics: TrainingMetrics) => {
      const progress = metrics.epoch / config.hyperparams.epochs;
      onProgress?.({
        stage: 'training',
        progress,
        message: `Training epoch ${metrics.epoch}/${config.hyperparams.epochs}`,
        currentEpoch: metrics.epoch,
        totalEpochs: config.hyperparams.epochs,
        metrics
      });
    };
    
    // Train model based on type
    let result: TrainingResult;
    
    if (config.modelType === 'logistic') {
      result = await this.trainLogisticRegressionEnhanced(
        trainX, trainY, valX, valY, testX, testY,
        prepared.featureMatrixShape.cols,
        config.hyperparams,
        prepared.featureNames,
        encodingInfo,
        preprocessing,
        trainingProgressCallback
      );
    } else {
      throw new Error(`Model type ${config.modelType} not implemented yet`);
    }
    
    const endTime = performance.now();
    result.performance = {
      trainingTimeMs: endTime - startTime,
      samplesProcessed: trainIndices.length,
      epochsCompleted: result.trainingHistory.length
    };
    
    onProgress?.({
      stage: 'complete',
      progress: 1,
      message: 'Training completed successfully!'
    });
    
    return result;
  }
  
  /**
   * Enhanced logistic regression training with comprehensive metrics
   * IMPLEMENTATION UPDATE: Added test set evaluation and performance tracking
   */
  private static async trainLogisticRegressionEnhanced(
    trainX: Float32Array,
    trainY: Float32Array,
    valX: Float32Array,
    valY: Float32Array,
    testX: Float32Array | null,
    testY: Float32Array | null,
    numFeatures: number,
    config: LogisticRegressionConfig,
    featureNames: string[],
    encodingInfo: any[],
    preprocessing: any,
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
    
    let testMetrics: TrainingMetrics | undefined;
    if (testX && testY) {
      const testEval = model.evaluate(testX, testY, testX.length / numFeatures, numFeatures);
      testMetrics = {
        epoch: config.epochs,
        loss: testEval.loss,
        acc: testEval.accuracy
      };
    }
    
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
      testMetrics,
      trainingHistory: trainedModel.trainingHistory,
      encodingInfo,
      preprocessing,
      performance: {
        trainingTimeMs: 0, // Will be set by caller
        samplesProcessed: trainX.length / numFeatures,
        epochsCompleted: trainedModel.trainingHistory.length
      }
    };
  }
  
  /**
   * Enhanced data splitting with optional test set
   * IMPLEMENTATION UPDATE: Support for three-way data splits
   */
  private static splitDataEnhanced(
    prepared: PreparedDataset,
    trainIndices: number[],
    valIndices: number[],
    testIndices?: number[]
  ): {
    trainX: Float32Array;
    trainY: Float32Array;
    valX: Float32Array;
    valY: Float32Array;
    testX: Float32Array | null;
    testY: Float32Array | null;
  } {
    
    const numFeatures = prepared.featureMatrixShape.cols;
    
    // Create training set
    const trainSize = trainIndices.length;
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
    const valSize = valIndices.length;
    const valX = new Float32Array(valSize * numFeatures);
    const valY = new Float32Array(valSize);
    
    for (let i = 0; i < valSize; i++) {
      const originalIdx = valIndices[i];
      valY[i] = prepared.target[originalIdx];
      
      for (let j = 0; j < numFeatures; j++) {
        valX[i * numFeatures + j] = prepared.features[originalIdx * numFeatures + j];
      }
    }
    
    // Create test set if indices provided
    let testX: Float32Array | null = null;
    let testY: Float32Array | null = null;
    
    if (testIndices && testIndices.length > 0) {
      const testSize = testIndices.length;
      testX = new Float32Array(testSize * numFeatures);
      testY = new Float32Array(testSize);
      
      for (let i = 0; i < testSize; i++) {
        const originalIdx = testIndices[i];
        testY[i] = prepared.target[originalIdx];
        
        for (let j = 0; j < numFeatures; j++) {
          testX[i * numFeatures + j] = prepared.features[originalIdx * numFeatures + j];
        }
      }
    }
    
    return { trainX, trainY, valX, valY, testX, testY };
  }

  /**
   * Legacy method - use trainLogisticRegressionEnhanced instead
   * IMPLEMENTATION UPDATE: Marked as deprecated
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
    
    // Delegate to enhanced version with null test data
    return this.trainLogisticRegressionEnhanced(
      trainX, trainY, valX, valY, null, null,
      numFeatures, config, featureNames, encodingInfo,
      { removedFeatures: [], missingValueStats: {} }, // Default preprocessing
      onProgress
    );
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