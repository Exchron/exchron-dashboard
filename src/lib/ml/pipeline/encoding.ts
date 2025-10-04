// Data preprocessing pipeline for ML training
// TODO(ClassroomSpec:6.1) Implement encoding and normalization pipeline

import { zScoreNormalize, stratifiedSplit } from '../core/math';
import type { RawDataset, InferredColumnMeta, PreparedDataset } from '../../../types/ml';

export interface PreprocessingConfig {
  targetColumn: string;
  selectedFeatures: string[];
  normalization: boolean;
  missingValueStrategy: Record<string, 'drop' | 'mean' | 'mode'>;
  trainSplitRatio: number;
}

export interface EncodingInfo {
  columnName: string;
  type: 'numeric' | 'categorical' | 'boolean';
  categoricalMapping?: Map<string, number>;
  normalizeStats?: { mean: number; std: number };
}

export class DataPreprocessor {
  
  /**
   * Prepare dataset for ML training
   */
  static prepareDataset(
    rawDataset: RawDataset,
    columnMeta: InferredColumnMeta[],
    config: PreprocessingConfig
  ): {
    prepared: PreparedDataset;
    trainIndices: number[];
    valIndices: number[];
    encodingInfo: EncodingInfo[];
  } {
    
    // Filter and clean data
    const cleanedData = this.cleanData(rawDataset, columnMeta, config);
    
    // Encode features and target
    const { features, target, encodingInfo } = this.encodeData(cleanedData, columnMeta, config);
    
    // Create train/validation split
    const targetArray = Array.from(target);
    const { trainIndices, valIndices } = stratifiedSplit(targetArray, config.trainSplitRatio);
    
    const numSamples = features.length / config.selectedFeatures.length;
    
    const prepared: PreparedDataset = {
      features,
      featureMatrixShape: { 
        rows: numSamples, 
        cols: config.selectedFeatures.length 
      },
      featureNames: config.selectedFeatures,
      target,
      targetType: this.getTargetType(columnMeta, config.targetColumn),
      encodingMap: this.createEncodingMap(encodingInfo)
    };
    
    return { prepared, trainIndices, valIndices, encodingInfo };
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