// Data preprocessing pipeline for ML training
// Enhanced implementation with robust missing value handling and normalization

import { zScoreNormalize, stratifiedSplit } from '../core/math';
import type { RawDataset, InferredColumnMeta, PreparedDataset } from '../../../types/ml';

export interface PreprocessingConfig {
  targetColumn: string;
  selectedFeatures: string[];
  normalization: boolean;
  missingValueStrategy: Record<string, 'drop' | 'mean' | 'mode'>;
  trainSplitRatio: number;
  validationSplitRatio?: number; // Optional test split
  removeConstantFeatures?: boolean; // Remove features with no variation
  removeHighMissingFeatures?: boolean; // Remove features with >50% missing values
  oneHotEncode?: boolean; // Enable one-hot encoding for categorical features
}

export interface EncodingInfo {
  columnName: string;
  type: 'numeric' | 'categorical' | 'boolean';
  categoricalMapping?: Map<string, number>;
  normalizeStats?: { mean: number; std: number };
}

export class DataPreprocessor {
  
  /**
   * Prepare dataset for ML training with comprehensive preprocessing
   * IMPLEMENTATION UPDATE: Enhanced missing value handling, feature filtering, and one-hot encoding
   */
  static prepareDataset(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): {
    prepared: PreparedDataset;
    trainIndices: number[];
    valIndices: number[];
    testIndices?: number[];
    encodingInfo: EncodingInfo[];
    preprocessing: {
      removedFeatures: string[];
      missingValueStats: Record<string, { strategy: string; imputedCount: number }>;
      oneHotMapping?: Record<string, string[]>;
    };
  } {
    
    console.log('Starting dataset preprocessing...');
    
    // Step 1: Filter problematic features
    const { filteredFeatures, removedFeatures } = this.filterFeatures(
      rawDataset, columnMeta, config
    );
    
    // Step 2: Clean data and handle missing values
    const { cleanedData, missingValueStats } = this.cleanDataEnhanced(
      rawDataset, columnMeta, { ...config, selectedFeatures: filteredFeatures }
    );
    
    // Step 3: Encode features and target with one-hot encoding support
    const { features, target, encodingInfo, oneHotMapping } = this.encodeDataEnhanced(
      cleanedData, columnMeta, { ...config, selectedFeatures: filteredFeatures }
    );
    
    // Step 4: Create stratified splits (train/val/test)
    const targetArray = Array.from(target);
    const splitResult = this.createDataSplits(targetArray, config);
    
    const numSamples = features.length / filteredFeatures.length;
    
    const prepared: PreparedDataset = {
      features,
      featureMatrixShape: { 
        rows: numSamples, 
        cols: filteredFeatures.length 
      },
      featureNames: filteredFeatures,
      target,
      targetType: this.getTargetType(columnMeta, config.targetColumn),
      encodingMap: this.createEncodingMap(encodingInfo)
    };
    
    console.log(`Preprocessing complete: ${numSamples} samples, ${filteredFeatures.length} features`);
    
    return { 
      prepared, 
      ...splitResult,
      encodingInfo,
      preprocessing: {
        removedFeatures,
        missingValueStats,
        oneHotMapping
      }
    };
  }
  
  /**
   * Filter problematic features before processing
   * IMPLEMENTATION UPDATE: Added feature filtering logic
   */
  private static filterFeatures(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): { filteredFeatures: string[]; removedFeatures: string[] } {
    
    const removedFeatures: string[] = [];
    let filteredFeatures = [...config.selectedFeatures];
    
    // Remove constant features if enabled
    if (config.removeConstantFeatures) {
      const constantFeatures = columnMeta.filter(col => 
        config.selectedFeatures.includes(col.name) &&
        col.uniqueValues && col.uniqueValues.length <= 1
      ).map(col => col.name);
      
      filteredFeatures = filteredFeatures.filter(f => !constantFeatures.includes(f));
      removedFeatures.push(...constantFeatures);
    }
    
    // Remove high missing features if enabled
    if (config.removeHighMissingFeatures) {
      const highMissingFeatures = columnMeta.filter(col => 
        config.selectedFeatures.includes(col.name) &&
        col.missingCount / rawDataset.rows.length > 0.5
      ).map(col => col.name);
      
      filteredFeatures = filteredFeatures.filter(f => !highMissingFeatures.includes(f));
      removedFeatures.push(...highMissingFeatures);
    }
    
    return { filteredFeatures, removedFeatures };
  }
  
  /**
   * Enhanced data cleaning with better missing value handling
   * IMPLEMENTATION UPDATE: Comprehensive missing value strategies
   */
  private static cleanDataEnhanced(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): { 
    cleanedData: { header: string[]; rows: string[][] };
    missingValueStats: Record<string, { strategy: string; imputedCount: number }>;
  } {
    
    const targetIndex = rawDataset.header.indexOf(config.targetColumn);
    const missingValueStats: Record<string, { strategy: string; imputedCount: number }> = {};
    
    // Filter out rows with missing target values
    const validRows = rawDataset.rows.filter((row: string[]) => {
      const targetValue = row[targetIndex];
      return targetValue && targetValue.trim() !== '';
    });
    
    // Calculate imputation values for each column
    const imputationValues: Record<string, string> = {};
    
    for (const columnName of config.selectedFeatures) {
      const colIndex = rawDataset.header.indexOf(columnName);
      const strategy = config.missingValueStrategy[columnName] || 'mean';
      const colMeta = columnMeta.find(col => col.name === columnName);
      
      if (colMeta && strategy !== 'drop') {
        imputationValues[columnName] = this.calculateImputationValue(
          validRows, colIndex, strategy, colMeta
        );
      }
    }
    
    // Process rows with missing value handling
    let imputedCounts: Record<string, number> = {};
    
    const processedRows = validRows.map((row: string[]) => {
      return row.map((value: string, colIndex: number) => {
        const columnName = rawDataset.header[colIndex];
        
        if ((!value || value.trim() === '') && config.selectedFeatures.includes(columnName)) {
          const strategy = config.missingValueStrategy[columnName] || 'mean';
          
          if (strategy === 'drop') {
            return ''; // Will be handled later
          }
          
          imputedCounts[columnName] = (imputedCounts[columnName] || 0) + 1;
          return imputationValues[columnName] || '0';
        }
        
        return value;
      });
    });
    
    // Build missing value statistics
    for (const columnName of config.selectedFeatures) {
      const strategy = config.missingValueStrategy[columnName] || 'mean';
      missingValueStats[columnName] = {
        strategy,
        imputedCount: imputedCounts[columnName] || 0
      };
    }
    
    return {
      cleanedData: {
        header: rawDataset.header,
        rows: processedRows
      },
      missingValueStats
    };
  }
  
  /**
   * Calculate imputation value for missing data
   * IMPLEMENTATION UPDATE: Enhanced imputation methods
   */
  private static calculateImputationValue(
    rows: string[][],
    columnIndex: number,
    strategy: 'mean' | 'mode',
    columnMeta: InferredColumnMeta
  ): string {
    
    const validValues = rows
      .map(row => row[columnIndex])
      .filter(val => val && val.trim() !== '');
    
    if (strategy === 'mean' && columnMeta.inferredType === 'numeric') {
      const numericValues = validValues
        .map(val => parseFloat(val))
        .filter(val => !isNaN(val));
      
      if (numericValues.length > 0) {
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        return mean.toString();
      }
    }
    
    if (strategy === 'mode') {
      const valueCounts: Record<string, number> = {};
      validValues.forEach(val => {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
      
      let maxCount = 0;
      let mode = '';
      for (const value in valueCounts) {
        if (valueCounts[value] > maxCount) {
          maxCount = valueCounts[value];
          mode = value;
        }
      }
      
      if (mode) return mode;
    }
    
    // Fallback based on column type
    if (columnMeta.inferredType === 'numeric') return '0';
    if (columnMeta.inferredType === 'boolean') return 'false';
    return 'unknown';
  }
  
  /**
   * Enhanced encoding with one-hot encoding support
   * IMPLEMENTATION UPDATE: Added one-hot encoding for categorical features
   */
  private static encodeDataEnhanced(
    cleanedData: { header: string[]; rows: string[][] },
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): {
    features: Float32Array;
    target: Float32Array;
    encodingInfo: EncodingInfo[];
    oneHotMapping?: Record<string, string[]>;
  } {
    
    const numSamples = cleanedData.rows.length;
    const encodingInfo: EncodingInfo[] = [];
    const oneHotMapping: Record<string, string[]> = {};
    
    // Encode target
    const targetIndex = cleanedData.header.indexOf(config.targetColumn);
    const targetMeta = columnMeta.find(col => col.name === config.targetColumn)!;
    const { encoded: encodedTarget } = this.encodeColumn(
      cleanedData.rows.map(row => row[targetIndex]),
      targetMeta,
      config.targetColumn
    );
    
    // Encode features with one-hot encoding support
    const allFeatureValues: number[][] = [];
    let expandedFeatureNames: string[] = [];
    
    for (const featureName of config.selectedFeatures) {
      const featureIndex = cleanedData.header.indexOf(featureName);
      const featureMeta = columnMeta.find(col => col.name === featureName)!;
      const featureValues = cleanedData.rows.map(row => row[featureIndex]);
      
      const { encoded, info } = this.encodeColumn(featureValues, featureMeta, featureName);
      
      // Apply one-hot encoding for categorical features if enabled
      if (config.oneHotEncode && featureMeta.inferredType === 'categorical' && info.categoricalMapping) {
        const oneHotResult = this.oneHotEncode(encoded, info.categoricalMapping);
        oneHotResult.encodedVectors.forEach((vector, idx) => {
          allFeatureValues.push(vector);
          expandedFeatureNames.push(`${featureName}_${oneHotResult.categoryNames[idx]}`);
        });
        oneHotMapping[featureName] = oneHotResult.categoryNames;
        
        // Update encoding info for one-hot
        const oneHotInfo: EncodingInfo = {
          ...info,
          categoricalMapping: new Map(oneHotResult.categoryNames.map((name, idx) => [name, idx]))
        };
        encodingInfo.push(oneHotInfo);
      } else {
        allFeatureValues.push(encoded);
        expandedFeatureNames.push(featureName);
        encodingInfo.push(info);
      }
    }
    
    // Normalize numeric features if enabled
    if (config.normalization) {
      for (let i = 0; i < allFeatureValues.length; i++) {
        const info = encodingInfo[i];
        if (info.type === 'numeric') {
          const { normalized, mean, std } = zScoreNormalize(allFeatureValues[i]);
          allFeatureValues[i] = normalized;
          info.normalizeStats = { mean, std };
        }
      }
    }
    
    // Flatten features to row-major format
    const numFeatures = allFeatureValues.length;
    const features = new Float32Array(numSamples * numFeatures);
    
    for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
      for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
        features[sampleIdx * numFeatures + featureIdx] = allFeatureValues[featureIdx][sampleIdx];
      }
    }
    
    return {
      features,
      target: new Float32Array(encodedTarget),
      encodingInfo,
      oneHotMapping: Object.keys(oneHotMapping).length > 0 ? oneHotMapping : undefined
    };
  }
  
  /**
   * One-hot encode categorical features
   * IMPLEMENTATION UPDATE: Added one-hot encoding implementation
   */
  private static oneHotEncode(
    encoded: number[],
    categoricalMapping: Map<string, number>
  ): {
    encodedVectors: number[][];
    categoryNames: string[];
  } {
    
    const categories = Array.from(categoricalMapping.keys());
    const numCategories = categories.length;
    const numSamples = encoded.length;
    
    const encodedVectors: number[][] = [];
    
    for (let catIdx = 0; catIdx < numCategories; catIdx++) {
      const vector: number[] = new Array(numSamples);
      for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
        vector[sampleIdx] = encoded[sampleIdx] === catIdx ? 1 : 0;
      }
      encodedVectors.push(vector);
    }
    
    return {
      encodedVectors,
      categoryNames: categories
    };
  }
  
  /**
   * Create stratified data splits with optional test set
   * IMPLEMENTATION UPDATE: Enhanced splitting with test set support
   */
  private static createDataSplits(
    targetArray: number[],
    config: PreprocessingConfig
  ): {
    trainIndices: number[];
    valIndices: number[];
    testIndices?: number[];
  } {
    
    if (config.validationSplitRatio) {
      // Three-way split: train/val/test
      const testRatio = config.validationSplitRatio;
      const valRatio = (1 - config.trainSplitRatio) - testRatio;
      
      // First split: train vs (val + test)
      const { trainIndices, valIndices: valTestIndices } = stratifiedSplit(
        targetArray, 
        config.trainSplitRatio
      );
      
      // Second split: val vs test from remaining data
      const valTestLabels = valTestIndices.map(idx => targetArray[idx]);
      const valFromRemaining = valRatio / (valRatio + testRatio);
      const { trainIndices: valIndices, valIndices: testIndices } = stratifiedSplit(
        valTestLabels,
        valFromRemaining
      );
      
      // Map back to original indices
      const actualValIndices = valIndices.map(idx => valTestIndices[idx]);
      const actualTestIndices = testIndices.map(idx => valTestIndices[idx]);
      
      return {
        trainIndices,
        valIndices: actualValIndices,
        testIndices: actualTestIndices
      };
    } else {
      // Simple train/val split
      const { trainIndices, valIndices } = stratifiedSplit(targetArray, config.trainSplitRatio);
      return { trainIndices, valIndices };
    }
  }

  /**
   * Clean raw data by handling missing values
   */
  private static cleanData(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): { header: string[]; rows: string[][] } {
    
    const targetIndex = rawDataset.header.indexOf(config.targetColumn);
    
    // Filter out rows with missing target values
    const validRows = rawDataset.rows.filter((row: string[]) => {
      const targetValue = row[targetIndex];
      return targetValue && targetValue.trim() !== '';
    });
    
    // Handle missing values in feature columns
    const processedRows = validRows.map((row: string[]) => {
      return row.map((value: string, colIndex: number) => {
        const columnName = rawDataset.header[colIndex];
        const strategy = config.missingValueStrategy[columnName] || 'drop';
        
        if (!value || value.trim() === '') {
          if (strategy === 'mean' || strategy === 'mode') {
            // Calculate mean/mode from other rows
            return this.getImputeValue(validRows, colIndex, strategy, columnMeta[colIndex]);
          }
          return ''; // Will be handled later
        }
        return value;
      });
    });
    
    return {
      header: rawDataset.header,
      rows: processedRows
    };
  }
  
  /**
   * Get imputation value for missing data
   */
  private static getImputeValue(
    rows: string[][],
    columnIndex: number,
    strategy: 'mean' | 'mode',
    columnMeta: InferredColumnMeta
  ): string {
    
    const validValues = rows
      .map(row => row[columnIndex])
      .filter(val => val && val.trim() !== '');
    
    if (strategy === 'mean' && columnMeta.inferredType === 'numeric') {
      const numericValues = validValues
        .map(val => parseFloat(val))
        .filter(val => !isNaN(val));
      
      if (numericValues.length > 0) {
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        return mean.toString();
      }
    }
    
    if (strategy === 'mode') {
      const valueCounts: Record<string, number> = {};
      validValues.forEach(val => {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
      
      let maxCount = 0;
      let mode = '';
      for (const value in valueCounts) {
        if (valueCounts[value] > maxCount) {
          maxCount = valueCounts[value];
          mode = value;
        }
      }
      return mode;
    }
    
    return '0'; // Fallback
  }
  
  /**
   * Encode features and target for ML training
   */
  private static encodeData(
    cleanedData: { header: string[]; rows: string[][] },
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): {
    features: Float32Array;
    target: Float32Array;
    encodingInfo: EncodingInfo[];
  } {
    
    const numSamples = cleanedData.rows.length;
    const encodingInfo: EncodingInfo[] = [];
    
    // Encode target
    const targetIndex = cleanedData.header.indexOf(config.targetColumn);
    const targetMeta = columnMeta.find(col => col.name === config.targetColumn)!;
    const { encoded: encodedTarget, info: targetInfo } = this.encodeColumn(
      cleanedData.rows.map(row => row[targetIndex]),
      targetMeta,
      config.targetColumn
    );
    
    // Encode features
    const allFeatureValues: number[][] = [];
    
    for (const featureName of config.selectedFeatures) {
      const featureIndex = cleanedData.header.indexOf(featureName);
      const featureMeta = columnMeta.find(col => col.name === featureName)!;
      const featureValues = cleanedData.rows.map(row => row[featureIndex]);
      
      const { encoded, info } = this.encodeColumn(featureValues, featureMeta, featureName);
      allFeatureValues.push(encoded);
      encodingInfo.push(info);
    }
    
    // Normalize numeric features if enabled
    if (config.normalization) {
      for (let i = 0; i < allFeatureValues.length; i++) {
        const info = encodingInfo[i];
        if (info.type === 'numeric') {
          const { normalized, mean, std } = zScoreNormalize(allFeatureValues[i]);
          allFeatureValues[i] = normalized;
          info.normalizeStats = { mean, std };
        }
      }
    }
    
    // Flatten features to row-major format
    const numFeatures = allFeatureValues.length;
    const features = new Float32Array(numSamples * numFeatures);
    
    for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
      for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
        features[sampleIdx * numFeatures + featureIdx] = allFeatureValues[featureIdx][sampleIdx];
      }
    }
    
    return {
      features,
      target: new Float32Array(encodedTarget),
      encodingInfo
    };
  }
  
  /**
   * Encode a single column based on its type
   */
  private static encodeColumn(
    values: string[],
    columnMeta: InferredColumnMeta,
    columnName: string
  ): { encoded: number[]; info: EncodingInfo } {
    
    const info: EncodingInfo = {
      columnName,
      type: columnMeta.inferredType as 'numeric' | 'categorical' | 'boolean'
    };
    
    if (columnMeta.inferredType === 'numeric') {
      const encoded = values.map(val => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      });
      return { encoded, info };
    }
    
    if (columnMeta.inferredType === 'boolean') {
      const encoded = values.map(val => {
        const lower = val.toLowerCase();
        return (lower === 'true' || lower === '1' || lower === 'yes') ? 1 : 0;
      });
      return { encoded, info };
    }
    
    if (columnMeta.inferredType === 'categorical') {
      // Create categorical mapping
      const uniqueValues = Array.from(new Set(values));
      const mapping = new Map<string, number>();
      uniqueValues.forEach((val, idx) => mapping.set(val, idx));
      
      info.categoricalMapping = mapping;
      
      const encoded = values.map(val => mapping.get(val) || 0);
      return { encoded, info };
    }
    
    // Default: treat as categorical
    const uniqueValues = Array.from(new Set(values));
    const mapping = new Map<string, number>();
    uniqueValues.forEach((val, idx) => mapping.set(val, idx));
    
    info.categoricalMapping = mapping;
    info.type = 'categorical';
    
    const encoded = values.map(val => mapping.get(val) || 0);
    return { encoded, info };
  }
  
  /**
   * Determine target type
   */
  private static getTargetType(
    columnMeta: InferredColumnMeta[],
    targetColumn: string
  ): 'binary' | 'multiclass' | 'regression' {
    
    const targetMeta = columnMeta.find(col => col.name === targetColumn);
    if (!targetMeta) return 'binary';
    
    if (targetMeta.inferredType === 'numeric') {
      return 'regression';
    }
    
    const numClasses = targetMeta.uniqueValues?.length || 2;
    return numClasses <= 2 ? 'binary' : 'multiclass';
  }
  
  /**
   * Create encoding map for dataset metadata
   */
  private static createEncodingMap(encodingInfo: EncodingInfo[]): Record<string, string[]> {
    const encodingMap: Record<string, string[]> = {};
    
    encodingInfo.forEach(info => {
      if (info.categoricalMapping) {
        encodingMap[info.columnName] = Array.from(info.categoricalMapping.keys());
      }
    });
    
    return encodingMap;
  }
  
  /**
   * Apply same preprocessing to new data for inference
   */
  static preprocessInference(
    rawData: Record<string, string>,
    encodingInfo: EncodingInfo[]
  ): Float32Array {
    
    const processed: number[] = [];
    
    for (const info of encodingInfo) {
      const rawValue = rawData[info.columnName] || '';
      let encodedValue = 0;
      
      if (info.type === 'numeric') {
        encodedValue = parseFloat(rawValue) || 0;
        
        // Apply normalization if available
        if (info.normalizeStats) {
          encodedValue = (encodedValue - info.normalizeStats.mean) / info.normalizeStats.std;
        }
      } else if (info.type === 'boolean') {
        const lower = rawValue.toLowerCase();
        encodedValue = (lower === 'true' || lower === '1' || lower === 'yes') ? 1 : 0;
      } else if (info.type === 'categorical' && info.categoricalMapping) {
        encodedValue = info.categoricalMapping.get(rawValue) || 0;
      }
      
      processed.push(encodedValue);
    }
    
    return new Float32Array(processed);
  }
}