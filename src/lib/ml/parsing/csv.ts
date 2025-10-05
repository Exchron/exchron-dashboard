// CSV parsing and type inference for Exchron ML
// TODO(ClassroomSpec:6.1) Implement robust CSV parsing with type inference

import {
	RawDataset,
	InferredColumnMeta,
	ColumnType,
	ParseStats,
} from '../../../types/ml';

/**
 * Parse CSV file content and infer column types
 * Enhanced with robust validation, error handling, and data quality checks
 */
export interface CSVParseOptions {
	maxRows?: number;
	tolerant?: boolean; // if true, skip inconsistent rows instead of failing
	maxInconsistencyRatio?: number; // allowed inconsistent row ratio (default 0.3 when tolerant)
	autoDetectDelimiter?: boolean; // attempt delimiter detection if high inconsistency
	delimiters?: string[]; // delimiters to try for auto-detect
}

export class CSVParser {
	/**
	 * Parse CSV string into structured dataset with type inference
	 * @param csvContent - Raw CSV file content
	 * @param filename - Name of the file for reference
	 * @param maxRows - Maximum rows to process (for performance)
	 * @returns Parsed dataset with inferred column metadata
	 */
	static async parseCSV(
		csvContent: string,
		filename: string = 'dataset.csv',
		maxRowsOrOptions?: number | CSVParseOptions,
		maybeOptions?: CSVParseOptions,
	): Promise<{
		rawDataset: RawDataset;
		columnMeta: InferredColumnMeta[];
		parseStats: ParseStats;
	}> {
		try {
			// Validate input
			if (!csvContent || csvContent.trim().length === 0) {
				throw new Error('CSV content is empty or invalid');
			}

			// Normalize options
			let options: CSVParseOptions = {};
			if (typeof maxRowsOrOptions === 'number') {
				options.maxRows = maxRowsOrOptions;
				options = { ...options, ...(maybeOptions || {}) };
			} else if (typeof maxRowsOrOptions === 'object' && maxRowsOrOptions) {
				options = { ...maxRowsOrOptions };
			}

			const primaryDelimiters = options.delimiters || [',', ';', '\t', '|'];

			// Track chosen delimiter
			let chosenDelimiter = ',';
			// Initial parse (comma default)
			let lines = this.parseCSVLines(csvContent, chosenDelimiter);

			// If auto-detect enabled and high inconsistency, try alternative delimiters
			if (options.autoDetectDelimiter) {
				const inconsistencyScore = this.calculateInconsistency(lines);
				if (inconsistencyScore > 0.3) {
					let bestLines = lines;
					let bestScore = inconsistencyScore;
					let chosen = ',';
					for (const d of primaryDelimiters) {
						const test = this.parseCSVLines(csvContent, d);
						const score = this.calculateInconsistency(test);
						if (score < bestScore && test.length > 1) {
							bestLines = test;
							bestScore = score;
							chosen = d;
						}
					}
					lines = bestLines;
					if (bestScore < inconsistencyScore) {
						console.info(
							`Auto-detected delimiter '${chosen}' (inconsistency ${(
								bestScore * 100
							).toFixed(1)}%)`,
						);
						chosenDelimiter = chosen;
					}
				}
			}

			if (lines.length === 0) {
				throw new Error('CSV file contains no valid rows');
			}

			if (lines.length === 1) {
				throw new Error(
					'CSV file must contain header and at least one data row',
				);
			}

			const header = lines[0];
			let rows = lines.slice(1);

			// Apply row limit if specified (for performance with large datasets)
			const maxRows =
				options.maxRows ?? (maxRowsOrOptions as number | undefined);
			if (maxRows && rows.length > maxRows) {
				console.log(
					`Dataset truncated to ${maxRows} rows for performance (original: ${rows.length} rows)`,
				);
				rows = rows.slice(0, maxRows);
			}

			// Validate header
			this.validateHeader(header);

			// Validate rows have consistent column count
			const rowCheck = this.validateRowConsistency(header, rows, options);
			const totalRowsBefore = rows.length;
			if (rowCheck.filtered) {
				rows = rowCheck.rows; // adopt filtered rows in tolerant mode
			}
			const totalRowsAfter = rows.length;
			const inconsistentRowsDropped = rowCheck.filtered
				? totalRowsBefore - totalRowsAfter
				: 0;

			// Create raw dataset
			const rawDataset: RawDataset = {
				name: filename,
				originalCSV: csvContent,
				rows,
				header,
			};

			// Infer column types with enhanced analysis
			const columnMeta = this.inferColumnTypes(header, rows);

			// Final validation for ML readiness
			this.validateForML(columnMeta, rows);

			const parseStats: ParseStats = {
				delimiter: chosenDelimiter,
				inconsistentRowsDropped,
				totalRowsBefore,
				totalRowsAfter,
			};

			return { rawDataset, columnMeta, parseStats };
		} catch (error) {
			console.error('CSV parsing failed:', error);
			throw new Error(
				`Failed to parse CSV: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	/**
	 * Validate header for common issues
	 * @param header - Column headers array
	 */
	private static validateHeader(header: string[]): void {
		if (header.length === 0) {
			throw new Error('CSV header is empty');
		}

		// Check for duplicate column names
		const uniqueHeaders = new Set(header);
		if (uniqueHeaders.size !== header.length) {
			throw new Error('Duplicate column names found in header');
		}

		// Check for empty column names
		const emptyColumns = header.filter((col) => !col || col.trim() === '');
		if (emptyColumns.length > 0) {
			throw new Error('Empty column names found in header');
		}

		// Warn about special characters in column names
		const specialCharColumns = header.filter((col) =>
			/[^a-zA-Z0-9_\s-]/.test(col),
		);
		if (specialCharColumns.length > 0) {
			console.warn(
				'Column names contain special characters:',
				specialCharColumns,
			);
		}
	}

	/**
	 * Validate row consistency
	 * @param header - Column headers
	 * @param rows - Data rows
	 */
	private static validateRowConsistency(
		header: string[],
		rows: string[][],
		options?: CSVParseOptions,
	): { rows: string[][]; filtered: boolean } {
		const expectedColumns = header.length;
		const inconsistentIndices: number[] = [];
		rows.forEach((row, idx) => {
			if (row.length !== expectedColumns) inconsistentIndices.push(idx);
		});
		const inconsistentRows = inconsistentIndices.map((i) => rows[i]);

		if (inconsistentRows.length > 0) {
			console.warn(
				`${inconsistentRows.length} rows have inconsistent column count (expected: ${expectedColumns})`,
			);

			// Log first few problematic rows for debugging
			inconsistentRows.slice(0, 3).forEach((row, idx) => {
				console.warn(`Row ${idx + 2} has ${row.length} columns:`, row);
			});
		}

		// Allow up to 10% inconsistent rows, but warn user
		const ratio = inconsistentRows.length / rows.length;
		const tolerant = options?.tolerant;
		const allowed = options?.maxInconsistencyRatio ?? 0.3;
		if (inconsistentRows.length > 0 && tolerant) {
			if (ratio <= allowed) {
				console.warn(
					`Tolerant mode: dropping ${
						inconsistentRows.length
					} inconsistent rows (${(ratio * 100).toFixed(1)}%).`,
				);
				const filtered = rows.filter(
					(_, idx) => !inconsistentIndices.includes(idx),
				);
				return { rows: filtered, filtered: true };
			} else {
				throw new Error(
					`Too many inconsistent rows even in tolerant mode (${inconsistentRows.length}/${rows.length}).`,
				);
			}
		} else if (ratio > 0.1) {
			throw new Error(
				`Too many rows with inconsistent column count (${inconsistentRows.length}/${rows.length}). Please check CSV format.`,
			);
		}
		return { rows, filtered: false };
	}

	/**
	 * Validate dataset for ML readiness
	 * @param columnMeta - Inferred column metadata
	 * @param rows - Data rows
	 */
	private static validateForML(
		columnMeta: InferredColumnMeta[],
		rows: string[][],
	): void {
		const errors: string[] = [];

		// Check minimum rows
		if (rows.length < 10) {
			errors.push('Dataset must contain at least 10 rows for training');
		}

		// Check for potential target columns
		const categoricalColumns = columnMeta.filter(
			(col) =>
				col.inferredType === 'categorical' || col.inferredType === 'boolean',
		);

		if (categoricalColumns.length === 0) {
			errors.push(
				'No suitable target column found. Dataset should contain at least one categorical column.',
			);
		}

		// Check feature columns
		const featureColumns = columnMeta.filter(
			(col) =>
				col.inferredType === 'numeric' || col.inferredType === 'categorical',
		);

		if (featureColumns.length < 1) {
			errors.push(
				'Dataset must contain at least one feature column (numeric or categorical)',
			);
		}

		// Check for columns with too many missing values
		const problematicColumns = columnMeta.filter(
			(col) => col.missingCount / rows.length > 0.5,
		);

		if (problematicColumns.length > 0) {
			errors.push(
				`Columns with >50% missing values: ${problematicColumns
					.map((c) => c.name)
					.join(', ')}`,
			);
		}

		// Check for columns with only one unique value
		const constantColumns = columnMeta.filter(
			(col) => col.uniqueValues && col.uniqueValues.length <= 1,
		);

		if (constantColumns.length > 0) {
			console.warn(
				'Columns with constant values detected:',
				constantColumns.map((c) => c.name),
			);
		}

		if (errors.length > 0) {
			throw new Error(`Dataset validation failed:\n${errors.join('\n')}`);
		}
	}

	/**
	 * Parse CSV lines handling quoted fields and embedded commas
	 */
	private static parseCSVLines(
		csvContent: string,
		delimiter: string = ',',
	): string[][] {
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
				} else if (char === delimiter && !inQuotes) {
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

	private static calculateInconsistency(lines: string[][]): number {
		if (lines.length < 2) return 0;
		const headerLen = lines[0].length;
		const data = lines.slice(1);
		const inconsistent = data.filter((r) => r.length !== headerLen).length;
		return data.length === 0 ? 0 : inconsistent / data.length;
	}

	/**
	 * Infer column types based on data patterns
	 */
	private static inferColumnTypes(
		header: string[],
		rows: string[][],
	): InferredColumnMeta[] {
		const columnMeta: InferredColumnMeta[] = [];

		for (let colIndex = 0; colIndex < header.length; colIndex++) {
			const columnName = header[colIndex];
			const values = rows
				.map((row) => row[colIndex] || '')
				.filter((v) => v.trim() !== '');

			const meta: InferredColumnMeta = {
				name: columnName,
				index: colIndex,
				inferredType: this.inferSingleColumnType(values),
				missingCount: rows.length - values.length,
			};

			// Add type-specific metadata
			if (meta.inferredType === 'numeric') {
				const numericValues = values
					.map((v) => parseFloat(v))
					.filter((v) => !isNaN(v));
				if (numericValues.length > 0) {
					meta.min = Math.min(...numericValues);
					meta.max = Math.max(...numericValues);
					meta.mean =
						numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
					meta.std = Math.sqrt(
						numericValues.reduce(
							(acc, val) => acc + Math.pow(val - meta.mean!, 2),
							0,
						) / numericValues.length,
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
		const lowercaseValues = values.map((v) => v.toLowerCase());
		if (lowercaseValues.every((v) => booleanValues.has(v))) {
			return 'boolean';
		}

		// Numeric detection
		const numericCount = values.filter((v) => {
			const num = parseFloat(v);
			return !isNaN(num) && isFinite(num);
		}).length;

		if (numericCount / values.length >= 0.8) {
			return 'numeric';
		}

		// Datetime detection (basic patterns)
		const dateCount = values.filter((v) => {
			const date = new Date(v);
			return (
				!isNaN(date.getTime()) &&
				v.match(/\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}/)
			);
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
	static validateDataset(
		columnMeta: InferredColumnMeta[],
		rows: string[][],
	): string[] {
		const errors: string[] = [];

		// Check minimum rows
		if (rows.length < 10) {
			errors.push('Dataset must contain at least 10 rows for training');
		}

		// Check for potential target columns
		const categoricalColumns = columnMeta.filter(
			(col) =>
				col.inferredType === 'categorical' || col.inferredType === 'boolean',
		);

		if (categoricalColumns.length === 0) {
			errors.push(
				'No suitable target column found. Dataset should contain at least one categorical column.',
			);
		}

		// Check feature columns
		const featureColumns = columnMeta.filter(
			(col) =>
				col.inferredType === 'numeric' || col.inferredType === 'categorical',
		);

		if (featureColumns.length < 1) {
			errors.push(
				'Dataset must contain at least one feature column (numeric or categorical)',
			);
		}

		return errors;
	}
}
