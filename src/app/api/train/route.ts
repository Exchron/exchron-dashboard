import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { fileName, targetColumn, featureColumns, modelConfig } = body;

		// Validate required fields
		if (
			!fileName ||
			!targetColumn ||
			!featureColumns ||
			!Array.isArray(featureColumns)
		) {
			return NextResponse.json(
				{
					error:
						'Missing required fields: fileName, targetColumn, featureColumns',
				},
				{ status: 400 },
			);
		}

		// Get the dataset file path
		const dataDir = path.join(process.cwd(), 'data');
		const filePath = path.join(dataDir, fileName);

		// Check if file exists
		try {
			await fs.access(filePath);
		} catch {
			return NextResponse.json(
				{ error: `Dataset file not found: ${fileName}` },
				{ status: 404 },
			);
		}

		// Read CSV file
		const csvContent = await fs.readFile(filePath, 'utf-8');

		// Validate CSV structure
		const lines = csvContent.trim().split('\n');
		if (lines.length < 2) {
			return NextResponse.json(
				{ error: 'CSV file must have at least a header and one data row' },
				{ status: 400 },
			);
		}

		const headers = lines[0].split(',').map((h) => h.trim());

		// Validate target column exists
		if (!headers.includes(targetColumn)) {
			return NextResponse.json(
				{ error: `Target column '${targetColumn}' not found in dataset` },
				{ status: 400 },
			);
		}

		// Validate feature columns exist
		const missingFeatures = featureColumns.filter(
			(col: string) => !headers.includes(col),
		);
		if (missingFeatures.length > 0) {
			return NextResponse.json(
				{ error: `Feature columns not found: ${missingFeatures.join(', ')}` },
				{ status: 400 },
			);
		}

		// Extract data sample for validation
		const sampleData = lines
			.slice(1, Math.min(11, lines.length))
			.map((line) => {
				const row = line.split(',').map((cell) => cell.trim());
				const features: { [key: string]: any } = {};
				const target = row[headers.indexOf(targetColumn)];

				featureColumns.forEach((col: string) => {
					const value = row[headers.indexOf(col)];
					features[col] = parseFloat(value) || value;
				});

				return { features, target };
			});

		// Prepare response with dataset info and CSV content for client-side training
		const response = {
			success: true,
			datasetInfo: {
				fileName,
				totalRows: lines.length - 1,
				features: featureColumns,
				targetColumn,
				headers,
				sampleData: sampleData.slice(0, 5), // First 5 rows for preview
			},
			csvContent, // Send CSV content to client for processing
			trainingConfig: {
				hiddenLayers: modelConfig?.hiddenLayers || [64, 32],
				learningRate: modelConfig?.learningRate || 0.001,
				epochs: modelConfig?.epochs || 50,
				batchSize: modelConfig?.batchSize || 32,
				validationSplit: 0.2,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error('Training API error:', error);
		return NextResponse.json(
			{
				error: `Training failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			},
			{ status: 500 },
		);
	}
}

// Handle GET request to list available datasets
export async function GET() {
	try {
		const dataDir = path.join(process.cwd(), 'data');
		const files = await fs.readdir(dataDir);
		const csvFiles = files.filter((file) => file.endsWith('.csv'));

		const datasets = await Promise.all(
			csvFiles.map(async (file) => {
				const filePath = path.join(dataDir, file);
				const content = await fs.readFile(filePath, 'utf-8');
				const lines = content.trim().split('\n');
				const headers = lines[0]?.split(',').map((h) => h.trim()) || [];

				return {
					fileName: file,
					rowCount: lines.length - 1,
					columns: headers,
					size: content.length,
				};
			}),
		);

		return NextResponse.json({ datasets });
	} catch (error) {
		console.error('Dataset listing error:', error);
		return NextResponse.json(
			{ error: 'Failed to list datasets' },
			{ status: 500 },
		);
	}
}
