// Classroom state management store
// Simple reactive store without external dependencies

import React from 'react';
import { 
  ClassroomState, 
  DataInputState, 
  ModelSelectionState, 
  TrainingState, 
  TestExportState,
  RawDataset,
  InferredColumnMeta,
  PreparedDataset,
  TrainingRun
} from '../../../types/ml';

type StateListener = (state: ClassroomState) => void;

class ClassroomStore {
  private state: ClassroomState;
  private listeners: Set<StateListener> = new Set();
  private readonly STORAGE_KEY = 'exchron.classroom.state';

  constructor() {
    this.state = this.getInitialState();
    this.loadFromStorage();
  }

  private getInitialState(): ClassroomState {
    return {
      dataInput: {
        selectedDataSource: 'kepler',
        missingValueStrategy: {},
        normalization: true
      },
      modelSelection: {
        hyperparams: {}
      },
      training: {
        isTraining: false
      },
      testExport: {
        threshold: 0.5,
        manualInputValues: {},
        exportFormat: 'json-custom'
      }
    };
  }

  // State access
  getState(): ClassroomState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener(this.state));
    this.saveToStorage();
  }

  // Data Input actions
  setDataSource(source: DataInputState['selectedDataSource']) {
    this.state.dataInput.selectedDataSource = source;
    this.notify();
  }

  setUploadedFile(file: File) {
    this.state.dataInput.uploadedFile = file;
    this.notify();
  }

  setRawDataset(dataset: RawDataset, columnMeta: InferredColumnMeta[]) {
    this.state.dataInput.rawDataset = dataset;
    this.state.dataInput.columnMeta = columnMeta;
    this.notify();
  }

  setTargetColumn(columnName: string) {
    this.state.dataInput.targetColumn = columnName;
    this.notify();
  }

  setSelectedFeatures(features: string[]) {
    this.state.dataInput.selectedFeatures = features;
    this.notify();
  }

  setMissingValueStrategy(column: string, strategy: 'drop' | 'mean' | 'mode') {
    this.state.dataInput.missingValueStrategy[column] = strategy;
    this.notify();
  }

  setNormalization(enabled: boolean) {
    this.state.dataInput.normalization = enabled;
    this.notify();
  }

  // Model Selection actions
  setModelConfig(config: any) {
    this.state.modelSelection.selectedModel = config;
    this.notify();
  }

  setHyperparams(params: Record<string, any>) {
    this.state.modelSelection.hyperparams = { ...this.state.modelSelection.hyperparams, ...params };
    this.notify();
  }

  // Training actions
  setPreparedDataset(dataset: PreparedDataset) {
    this.state.training.preparedDataset = dataset;
    this.notify();
  }

  setTrainingRun(run: TrainingRun) {
    this.state.training.currentRun = run;
    this.notify();
  }

  setTrainingStatus(isTraining: boolean) {
    this.state.training.isTraining = isTraining;
    this.notify();
  }

  updateTrainingMetrics(epoch: number, metrics: any) {
    if (this.state.training.currentRun) {
      this.state.training.currentRun.epochMetrics.push({
        epoch,
        ...metrics
      });
      this.notify();
    }
  }

  // Test & Export actions
  setThreshold(threshold: number) {
    this.state.testExport.threshold = threshold;
    this.notify();
  }

  setManualInputValue(field: string, value: any) {
    this.state.testExport.manualInputValues[field] = value;
    this.notify();
  }

  setBatchTestFile(file: File) {
    this.state.testExport.batchTestFile = file;
    this.notify();
  }

  setExportFormat(format: 'json-custom' | 'json-tfjs') {
    this.state.testExport.exportFormat = format;
    this.notify();
  }

  // Persistence
  private saveToStorage() {
    try {
      // Don't save large binary data - only metadata
      const stateToSave = {
        ...this.state,
        dataInput: {
          ...this.state.dataInput,
          uploadedFile: undefined, // Don't save file objects
          rawDataset: this.state.dataInput.rawDataset ? {
            ...this.state.dataInput.rawDataset,
            originalCSV: this.state.dataInput.rawDataset.originalCSV.length > 50000 
              ? this.state.dataInput.rawDataset.originalCSV.substring(0, 50000) + '...[truncated]'
              : this.state.dataInput.rawDataset.originalCSV
          } : undefined
        },
        training: {
          ...this.state.training,
          preparedDataset: undefined // Don't save large Float32Arrays
        },
        testExport: {
          ...this.state.testExport,
          batchTestFile: undefined
        }
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save classroom state to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.state = { ...this.state, ...parsedState };
      }
    } catch (error) {
      console.warn('Failed to load classroom state from localStorage:', error);
    }
  }

  // Reset state
  reset() {
    this.state = this.getInitialState();
    localStorage.removeItem(this.STORAGE_KEY);
    this.notify();
  }

  // Clear specific sections
  clearDataInput() {
    this.state.dataInput = {
      selectedDataSource: 'kepler',
      missingValueStrategy: {},
      normalization: true
    };
    this.notify();
  }

  clearTraining() {
    this.state.training = {
      isTraining: false
    };
    this.notify();
  }
}

// Singleton instance
export const classroomStore = new ClassroomStore();

// React hook for component integration
export function useClassroomStore(): [ClassroomState, ClassroomStore] {
  const [state, setState] = React.useState(classroomStore.getState());

  React.useEffect(() => {
    const unsubscribe = classroomStore.subscribe(setState);
    return unsubscribe;
  }, []);

  return [state, classroomStore];
}

// For non-React usage
export { ClassroomStore };