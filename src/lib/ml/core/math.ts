// Mathematical utilities for ML operations
// TODO(ClassroomSpec:6.3) Add stable math functions for logistic training

/**
 * Sigmoid activation function with numerical stability
 */
export function sigmoid(x: number): number {
  // Clip extreme values to prevent overflow
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Softmax function for multiclass classification
 */
export function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(x => Math.exp(x - maxLogit)); // Numerical stability
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sumExps);
}

/**
 * Z-score normalization
 */
export function zScoreNormalize(values: number[]): { normalized: number[]; mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  // Avoid division by zero
  if (std === 0) {
    return { normalized: values.map(() => 0), mean, std: 1 };
  }
  
  const normalized = values.map(x => (x - mean) / std);
  return { normalized, mean, std };
}

/**
 * Min-max normalization
 */
export function minMaxNormalize(values: number[]): { normalized: number[]; min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Avoid division by zero
  if (max === min) {
    return { normalized: values.map(() => 0.5), min, max };
  }
  
  const normalized = values.map(x => (x - min) / (max - min));
  return { normalized, min, max };
}

/**
 * Generate random numbers with normal distribution (Box-Muller transform)
 */
export function randomNormal(mean: number = 0, std: number = 1): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * std + mean;
}

/**
 * Xavier/Glorot initialization for neural network weights
 */
export function xavierInit(inputSize: number, outputSize: number): number[] {
  const limit = Math.sqrt(6 / (inputSize + outputSize));
  const weights: number[] = [];
  
  for (let i = 0; i < inputSize * outputSize; i++) {
    weights.push((Math.random() * 2 - 1) * limit);
  }
  
  return weights;
}

/**
 * Shuffle array indices for random sampling
 */
export function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  return indices;
}

/**
 * Create stratified train/validation split
 */
export function stratifiedSplit(
  labels: number[], 
  trainRatio: number = 0.8
): { trainIndices: number[]; valIndices: number[] } {
  
  // Group indices by class
  const classBuckets: { [key: number]: number[] } = {};
  labels.forEach((label, index) => {
    if (!classBuckets[label]) classBuckets[label] = [];
    classBuckets[label].push(index);
  });
  
  const trainIndices: number[] = [];
  const valIndices: number[] = [];
  
  // Split each class proportionally
  for (const classLabel in classBuckets) {
    const indices = shuffleIndices(classBuckets[classLabel].length)
      .map(i => classBuckets[classLabel][i]);
    
    const trainCount = Math.floor(indices.length * trainRatio);
    trainIndices.push(...indices.slice(0, trainCount));
    valIndices.push(...indices.slice(trainCount));
  }
  
  return { trainIndices, valIndices };
}

/**
 * Calculate class weights for imbalanced datasets
 */
export function calculateClassWeights(labels: number[]): { [key: number]: number } {
  const classCounts: { [key: number]: number } = {};
  labels.forEach(label => {
    classCounts[label] = (classCounts[label] || 0) + 1;
  });
  
  const totalSamples = labels.length;
  const numClasses = Object.keys(classCounts).length;
  const weights: { [key: number]: number } = {};
  
  for (const classLabel in classCounts) {
    weights[Number(classLabel)] = totalSamples / (numClasses * classCounts[classLabel]);
  }
  
  return weights;
}

/**
 * Clamp values to prevent numerical instability
 */
export function clamp(value: number, min: number = -20, max: number = 20): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Logarithm with numerical stability
 */
export function safeLog(x: number, epsilon: number = 1e-15): number {
  return Math.log(Math.max(x, epsilon));
}