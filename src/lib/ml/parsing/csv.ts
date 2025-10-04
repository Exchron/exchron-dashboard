// CSV parsing and type inference for Exchron ML
// TODO(ClassroomSpec:6.1) Implement robust CSV parsing with type inference

import { RawDataset, InferredColumnMeta, ColumnType } from '../../../types/ml';

/**
 * Parse CSV file content and infer column types
 * Handles client-side parsing without external dependencies
 */
export class CSVParser {
  
  /**
   * Parse CSV string into structured dataset with type inference
   */
  static async parseCSV(
    csvContent: string, 
    filename: string = 'dataset.csv'
  ): Promise<{ rawDataset: RawDataset; columnMeta: InferredColumnMeta[] }> {
    
    // Basic CSV parsing - handles quoted fields and commas
    const lines = this.parseCSVLines(csvContent);
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    if (lines.length === 1) {
      throw new Error('CSV file must contain header and at least one data row');
    }
    
    const header = lines[0];
    const rows = lines.slice(1);
    
    // Create raw dataset
    const rawDataset: RawDataset = {
      name: filename,
      originalCSV: csvContent,
      rows,
      header
    };
    
    // Infer column types
    const columnMeta = this.inferColumnTypes(header, rows);
    
    return { rawDataset, columnMeta };
  }
  
  /**
   * Parse CSV lines handling quoted fields and embedded commas
   */
  private static parseCSVLines(csvContent: string): string[][] {
    const lines: string[][] = [];
    const rows = csvContent.split('\n');
    
    for (const row of rows) {
      if (row.trim() === '') continue;
      
      const fields: string[] = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < row.length) {
        const char = row[i];
        
        if (char === '"') {
          if (inQuotes && row[i + 1] === '"') {
            // Escaped quote
            currentField += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          fields.push(currentField.trim());
          currentField = '';
          i++;
        } else {
          currentField += char;
          i++;
        }
      }
      
      // Add the last field
      fields.push(currentField.trim());
      lines.push(fields);
    }
    
    return lines;
  }
  
  /**
   * Infer column types based on data patterns
   */
  private static inferColumnTypes(
    header: string[], 
    rows: string[][]
  ): InferredColumnMeta[] {
    
    const columnMeta: InferredColumnMeta[] = [];
    
    for (let colIndex = 0; colIndex < header.length; colIndex++) {
      const columnName = header[colIndex];
      const values = rows.map(row => row[colIndex] || '').filter(v => v.trim() !== '');
      
      const meta: InferredColumnMeta = {
        name: columnName,
        index: colIndex,
        inferredType: this.inferSingleColumnType(values),
        missingCount: rows.length - values.length
      };
      
      // Add type-specific metadata
      if (meta.inferredType === 'numeric') {
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (numericValues.length > 0) {
          meta.min = Math.min(...numericValues);
          meta.max = Math.max(...numericValues);
          meta.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          meta.std = Math.sqrt(
            numericValues.reduce((acc, val) => acc + Math.pow(val - meta.mean!, 2), 0) / numericValues.length
          );
        }
      } else if (meta.inferredType === 'categorical') {
        meta.uniqueValues = Array.from(new Set(values)).slice(0, 50); // Limit for performance
      }
      
      columnMeta.push(meta);
    }
    
    return columnMeta;
  }
  
  /**
   * Infer type for a single column based on its values
   */
  private static inferSingleColumnType(values: string[]): ColumnType {
    if (values.length === 0) return 'text';
    
    // Boolean detection
    const booleanValues = new Set(['true', 'false', '1', '0', 'yes', 'no']);
    const lowercaseValues = values.map(v => v.toLowerCase());
    if (lowercaseValues.every(v => booleanValues.has(v))) {
      return 'boolean';
    }
    
    // Numeric detection
    const numericCount = values.filter(v => {
      const num = parseFloat(v);
      return !isNaN(num) && isFinite(num);
    }).length;
    
    if (numericCount / values.length >= 0.8) {
      return 'numeric';
    }
    
    // Datetime detection (basic patterns)
    const dateCount = values.filter(v => {
      const date = new Date(v);
      return !isNaN(date.getTime()) && v.match(/\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}/);
    }).length;
    
    if (dateCount / values.length >= 0.8) {
      return 'datetime';
    }
    
    // Categorical detection (reasonable number of unique values)
    const uniqueValues = new Set(values);
    if (uniqueValues.size <= 30 && uniqueValues.size < values.length * 0.5) {
      return 'categorical';
    }
    
    // Default to text
    return 'text';
  }
  
  /**
   * Validate dataset for ML readiness
   */
  static validateDataset(columnMeta: InferredColumnMeta[], rows: string[][]): string[] {
    const errors: string[] = [];
    
    // Check minimum rows
    if (rows.length < 10) {
      errors.push('Dataset must contain at least 10 rows for training');
    }
    
    // Check for potential target columns
    const categoricalColumns = columnMeta.filter(col => 
      col.inferredType === 'categorical' || col.inferredType === 'boolean'
    );
    
    if (categoricalColumns.length === 0) {
      errors.push('No suitable target column found. Dataset should contain at least one categorical column.');
    }
    
    // Check feature columns
    const featureColumns = columnMeta.filter(col => 
      col.inferredType === 'numeric' || col.inferredType === 'categorical'
    );
    
    if (featureColumns.length < 1) {
      errors.push('Dataset must contain at least one feature column (numeric or categorical)');
    }
    
    return errors;
  }
}