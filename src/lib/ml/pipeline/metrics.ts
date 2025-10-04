// ML evaluation metrics calculation
// TODO(ClassroomSpec:11) Implement comprehensive metrics for binary/multiclass classification

import { EvaluationSummary } from '../../../types/ml';

/**
 * Calculate confusion matrix for binary or multiclass classification
 */
export function calculateConfusionMatrix(
  predictions: number[], 
  labels: number[], 
  numClasses?: number
): number[][] {
  const classes = numClasses || Math.max(...labels, ...predictions) + 1;
  const matrix: number[][] = Array(classes).fill(0).map(() => Array(classes).fill(0));
  
  for (let i = 0; i < predictions.length; i++) {
    const pred = Math.round(predictions[i]);
    const actual = labels[i];
    if (pred < classes && actual < classes) {
      matrix[actual][pred]++;
    }
  }
  
  return matrix;
}

/**
 * Calculate accuracy from confusion matrix or predictions
 */
export function calculateAccuracy(predictions: number[], labels: number[]): number {
  let correct = 0;
  for (let i = 0; i < predictions.length; i++) {
    if (Math.round(predictions[i]) === labels[i]) {
      correct++;
    }
  }
  return correct / predictions.length;
}

/**
 * Calculate precision, recall, and F1 for binary classification
 */
export function calculatePrecisionRecallF1(
  confusionMatrix: number[][], 
  classIndex: number = 1
): { precision: number; recall: number; f1: number } {
  
  if (confusionMatrix.length < 2) {
    return { precision: 0, recall: 0, f1: 0 };
  }
  
  let truePositives = confusionMatrix[classIndex][classIndex];
  let falsePositives = 0;
  let falseNegatives = 0;
  
  // Calculate false positives (predicted as class but actually other classes)
  for (let i = 0; i < confusionMatrix.length; i++) {
    if (i !== classIndex) {
      falsePositives += confusionMatrix[i][classIndex];
    }
  }
  
  // Calculate false negatives (actually class but predicted as other classes)
  for (let j = 0; j < confusionMatrix[classIndex].length; j++) {
    if (j !== classIndex) {
      falseNegatives += confusionMatrix[classIndex][j];
    }
  }
  
  const precision = truePositives + falsePositives > 0 
    ? truePositives / (truePositives + falsePositives) 
    : 0;
    
  const recall = truePositives + falseNegatives > 0 
    ? truePositives / (truePositives + falseNegatives) 
    : 0;
    
  const f1 = precision + recall > 0 
    ? 2 * (precision * recall) / (precision + recall) 
    : 0;
  
  return { precision, recall, f1 };
}

/**
 * Calculate ROC AUC for binary classification
 */
export function calculateROCAUC(probabilities: number[], labels: number[]): number {
  // Create array of (probability, label) pairs and sort by probability descending
  const pairs = probabilities.map((prob, i) => ({ prob, label: labels[i] }))
    .sort((a, b) => b.prob - a.prob);
  
  const positives = labels.filter(l => l === 1).length;
  const negatives = labels.length - positives;
  
  if (positives === 0 || negatives === 0) {
    return 0.5; // No discrimination possible
  }
  
  let truePositives = 0;
  let falsePositives = 0;
  const points: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
  
  for (const pair of pairs) {
    if (pair.label === 1) {
      truePositives++;
    } else {
      falsePositives++;
    }
    
    const tpr = truePositives / positives;
    const fpr = falsePositives / negatives;
    points.push({ fpr, tpr });
  }
  
  // Calculate AUC using trapezoidal rule
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const width = points[i].fpr - points[i-1].fpr;
    const height = (points[i].tpr + points[i-1].tpr) / 2;
    auc += width * height;
  }
  
  return auc;
}

/**
 * Calculate comprehensive evaluation summary
 */
export function calculateEvaluationSummary(
  probabilities: number[],
  predictions: number[],
  labels: number[],
  threshold: number = 0.5,
  classLabels: string[] = ['False', 'True']
): EvaluationSummary {
  
  // Apply threshold to probabilities to get binary predictions
  const binaryPredictions = probabilities.map(p => p >= threshold ? 1 : 0);
  
  const confusionMatrix = calculateConfusionMatrix(binaryPredictions, labels, 2);
  const accuracy = calculateAccuracy(binaryPredictions, labels);
  const { precision, recall, f1 } = calculatePrecisionRecallF1(confusionMatrix, 1);
  const auc = calculateROCAUC(probabilities, labels);
  
  return {
    accuracy,
    precision,
    recall,
    f1,
    auc,
    confusionMatrix,
    classLabels,
    threshold
  };
}

/**
 * Calculate metrics for multiclass classification
 */
export function calculateMulticlassMetrics(
  predictions: number[],
  labels: number[],
  classLabels: string[]
): {
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  confusionMatrix: number[][];
  perClassMetrics: Array<{ precision: number; recall: number; f1: number; support: number }>;
} {
  
  const confusionMatrix = calculateConfusionMatrix(predictions, labels, classLabels.length);
  const accuracy = calculateAccuracy(predictions, labels);
  
  const perClassMetrics = [];
  let macroF1 = 0;
  let weightedF1 = 0;
  let totalSupport = 0;
  
  for (let classIndex = 0; classIndex < classLabels.length; classIndex++) {
    const { precision, recall, f1 } = calculatePrecisionRecallF1(confusionMatrix, classIndex);
    const support = confusionMatrix[classIndex].reduce((a, b) => a + b, 0);
    
    perClassMetrics.push({ precision, recall, f1, support });
    macroF1 += f1;
    weightedF1 += f1 * support;
    totalSupport += support;
  }
  
  macroF1 /= classLabels.length;
  weightedF1 /= totalSupport;
  
  return {
    accuracy,
    macroF1,
    weightedF1,
    confusionMatrix,
    perClassMetrics
  };
}

/**
 * Find optimal threshold for binary classification (maximizing F1 score)
 */
export function findOptimalThreshold(
  probabilities: number[],
  labels: number[],
  metric: 'f1' | 'youden' = 'f1'
): { threshold: number; score: number } {
  
  const thresholds = Array.from({ length: 100 }, (_, i) => i / 100);
  let bestThreshold = 0.5;
  let bestScore = 0;
  
  for (const threshold of thresholds) {
    const predictions = probabilities.map(p => p >= threshold ? 1 : 0);
    const confusionMatrix = calculateConfusionMatrix(predictions, labels, 2);
    
    let score = 0;
    if (metric === 'f1') {
      const { f1 } = calculatePrecisionRecallF1(confusionMatrix, 1);
      score = f1;
    } else if (metric === 'youden') {
      // Youden's J statistic = Sensitivity + Specificity - 1
      const { recall } = calculatePrecisionRecallF1(confusionMatrix, 1);
      const { recall: specificity } = calculatePrecisionRecallF1(confusionMatrix, 0);
      score = recall + specificity - 1;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestThreshold = threshold;
    }
  }
  
  return { threshold: bestThreshold, score: bestScore };
}