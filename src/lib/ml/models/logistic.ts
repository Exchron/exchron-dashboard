// Logistic Regression implementation for binary classification
// IMPLEMENTATION UPDATE: Enhanced with stable gradient descent, L2 regularization, and batch processing

import { sigmoid, clamp, safeLog, shuffleIndices } from '../core/math';

export interface LogisticRegressionConfig {
  learningRate: number;
  epochs: number;
  regularization: number; // L2 regularization strength
  batchSize: number;
  earlyStoppingPatience: number;
  randomSeed?: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  valLoss?: number;
  acc?: number;
  valAcc?: number;
}

export interface LogisticRegressionModel {
  weights: Float32Array;
  bias: number;
  config: LogisticRegressionConfig;
  featureNames: string[];
  trainingHistory: TrainingMetrics[];
}

export class LogisticRegression {
  private weights: Float32Array;
  private bias: number;
  private config: LogisticRegressionConfig;
  private featureNames: string[];
  private trainingHistory: TrainingMetrics[] = [];

  constructor(numFeatures: number, config: LogisticRegressionConfig, featureNames: string[] = []) {
    this.config = config;
    this.featureNames = featureNames;
    
    // Initialize weights with small random values
    this.weights = new Float32Array(numFeatures);
    for (let i = 0; i < numFeatures; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.1; // Small random initialization
    }
    this.bias = 0;
  }

  /**
   * Train the logistic regression model
   */
  async train(
    X: Float32Array, 
    y: Float32Array, 
    numSamples: number,
    numFeatures: number,
    validationData?: { X: Float32Array; y: Float32Array; numSamples: number },
    onEpochComplete?: (metrics: TrainingMetrics) => void
  ): Promise<LogisticRegressionModel> {
    
    this.trainingHistory = [];
    let bestValLoss = Infinity;
    let patienceCounter = 0;
    let bestWeights = new Float32Array(this.weights);
    let bestBias = this.bias;

    const indices = Array.from({ length: numSamples }, (_, i) => i);
    
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      // Shuffle data for each epoch
      const shuffledIndices = shuffleIndices(numSamples);
      
      // Mini-batch gradient descent
      let epochLoss = 0;
      let correct = 0;
      
      for (let batchStart = 0; batchStart < numSamples; batchStart += this.config.batchSize) {
        const batchEnd = Math.min(batchStart + this.config.batchSize, numSamples);
        const batchSize = batchEnd - batchStart;
        
        // Calculate gradients for this batch
        const weightGradients = new Float32Array(numFeatures);
        let biasGradient = 0;
        let batchLoss = 0;
        
        for (let i = batchStart; i < batchEnd; i++) {
          const sampleIdx = shuffledIndices[i];
          const prediction = this.predictProbability(X, sampleIdx, numFeatures);
          const label = y[sampleIdx];
          const error = prediction - label;
          
          // Accumulate gradients
          for (let j = 0; j < numFeatures; j++) {
            const featureValue = X[sampleIdx * numFeatures + j];
            weightGradients[j] += error * featureValue;
          }
          biasGradient += error;
          
          // Calculate loss (cross-entropy)
          const logLoss = -label * safeLog(prediction) - (1 - label) * safeLog(1 - prediction);
          batchLoss += logLoss;
          epochLoss += logLoss;
          
          // Count correct predictions
          if ((prediction >= 0.5 ? 1 : 0) === label) {
            correct++;
          }
        }
        
        // Apply gradients with regularization
        for (let j = 0; j < numFeatures; j++) {
          const gradient = weightGradients[j] / batchSize + this.config.regularization * this.weights[j];
          this.weights[j] -= this.config.learningRate * gradient;
          this.weights[j] = clamp(this.weights[j], -10, 10); // Prevent extreme weights
        }
        
        this.bias -= this.config.learningRate * (biasGradient / batchSize);
        this.bias = clamp(this.bias, -10, 10);
      }
      
      const avgLoss = epochLoss / numSamples;
      const accuracy = correct / numSamples;
      
      // Validation metrics
      let valLoss: number | undefined;
      let valAcc: number | undefined;
      
      if (validationData) {
        const valMetrics = this.evaluate(
          validationData.X, 
          validationData.y, 
          validationData.numSamples,
          numFeatures
        );
        valLoss = valMetrics.loss;
        valAcc = valMetrics.accuracy;
        
        // Early stopping check
        if (valLoss < bestValLoss) {
          bestValLoss = valLoss;
          bestWeights = new Float32Array(this.weights);
          bestBias = this.bias;
          patienceCounter = 0;
        } else {
          patienceCounter++;
        }
        
        if (patienceCounter >= this.config.earlyStoppingPatience) {
          console.log(`Early stopping at epoch ${epoch + 1}`);
          // Restore best weights
          this.weights = bestWeights;
          this.bias = bestBias;
          break;
        }
      }
      
      const metrics: TrainingMetrics = {
        epoch: epoch + 1,
        loss: avgLoss,
        valLoss,
        acc: accuracy,
        valAcc
      };
      
      this.trainingHistory.push(metrics);
      
      if (onEpochComplete) {
        onEpochComplete(metrics);
      }
      
      // Yield control to prevent blocking
      if (epoch % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return {
      weights: this.weights,
      bias: this.bias,
      config: this.config,
      featureNames: this.featureNames,
      trainingHistory: this.trainingHistory
    };
  }

  /**
   * Predict probability for a single sample
   */
  private predictProbability(X: Float32Array, sampleIndex: number, numFeatures: number): number {
    let logit = this.bias;
    
    for (let j = 0; j < numFeatures; j++) {
      logit += this.weights[j] * X[sampleIndex * numFeatures + j];
    }
    
    return sigmoid(logit);
  }

  /**
   * Make predictions on a dataset
   */
  predict(X: Float32Array, numSamples: number, numFeatures: number): Float32Array {
    const predictions = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      predictions[i] = this.predictProbability(X, i, numFeatures);
    }
    
    return predictions;
  }

  /**
   * Make binary class predictions
   */
  predictClasses(X: Float32Array, numSamples: number, numFeatures: number, threshold: number = 0.5): Float32Array {
    const probabilities = this.predict(X, numSamples, numFeatures);
    const classes = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      classes[i] = probabilities[i] >= threshold ? 1 : 0;
    }
    
    return classes;
  }

  /**
   * Evaluate model on a dataset
   */
  evaluate(X: Float32Array, y: Float32Array, numSamples: number, numFeatures: number): {
    loss: number;
    accuracy: number;
  } {
    let totalLoss = 0;
    let correct = 0;
    
    for (let i = 0; i < numSamples; i++) {
      const prediction = this.predictProbability(X, i, numFeatures);
      const label = y[i];
      
      // Cross-entropy loss
      const logLoss = -label * safeLog(prediction) - (1 - label) * safeLog(1 - prediction);
      totalLoss += logLoss;
      
      // Accuracy
      if ((prediction >= 0.5 ? 1 : 0) === label) {
        correct++;
      }
    }
    
    return {
      loss: totalLoss / numSamples,
      accuracy: correct / numSamples
    };
  }

  /**
   * Get model summary
   */
  getSummary(): {
    numFeatures: number;
    numEpochs: number;
    finalLoss: number;
    finalAccuracy: number;
    weights: number[];
    bias: number;
  } {
    const lastMetrics = this.trainingHistory[this.trainingHistory.length - 1];
    
    return {
      numFeatures: this.weights.length,
      numEpochs: this.trainingHistory.length,
      finalLoss: lastMetrics?.loss || 0,
      finalAccuracy: lastMetrics?.acc || 0,
      weights: Array.from(this.weights),
      bias: this.bias
    };
  }

  /**
   * Export model for inference
   */
  export(): {
    type: 'logistic';
    weights: number[];
    bias: number;
    featureNames: string[];
    config: LogisticRegressionConfig;
  } {
    return {
      type: 'logistic',
      weights: Array.from(this.weights),
      bias: this.bias,
      featureNames: this.featureNames,
      config: this.config
    };
  }

  /**
   * Load model from exported data
   */
  static load(modelData: any): LogisticRegression {
    const model = new LogisticRegression(
      modelData.weights.length,
      modelData.config,
      modelData.featureNames
    );
    
    model.weights = new Float32Array(modelData.weights);
    model.bias = modelData.bias;
    
    return model;
  }
}