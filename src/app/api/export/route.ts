import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { modelData, metadata, exportFormat = 'json' } = body;

		if (!modelData || !metadata) {
			return NextResponse.json(
				{ error: 'Missing modelData or metadata' },
				{ status: 400 },
			);
		}

		// Create export directory
		const exportDir = path.join(process.cwd(), 'exported_models');
		await fs.mkdir(exportDir, { recursive: true });

		// Generate unique model name with timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const modelName = `neural_network_${timestamp}`;

		const modelPath = path.join(exportDir, modelName);

		// Save model files based on format
		let savedFiles: string[] = [];

		if (exportFormat === 'json' || exportFormat === 'json-tfjs') {
			// Save TensorFlow.js JSON format
			const modelJsonPath = `${modelPath}.json`;
			const weightsPath = `${modelPath}.weights.bin`;

			// Save model topology and weights info
			const modelJson = {
				...modelData.modelTopology,
				weightsManifest: [
					{
						paths: [`${modelName}.weights.bin`],
						weights: modelData.weightSpecs || [],
					},
				],
			};

			await fs.writeFile(modelJsonPath, JSON.stringify(modelJson, null, 2));
			savedFiles.push(`${modelName}.json`);

			// Save weights if provided
			if (modelData.weightData) {
				await fs.writeFile(weightsPath, Buffer.from(modelData.weightData));
				savedFiles.push(`${modelName}.weights.bin`);
			}
		}

		// Always save metadata
		const metadataPath = `${modelPath}_metadata.json`;
		const enrichedMetadata = {
			...metadata,
			exportedAt: new Date().toISOString(),
			exportFormat,
			modelName,
			files: savedFiles,
		};

		await fs.writeFile(metadataPath, JSON.stringify(enrichedMetadata, null, 2));
		savedFiles.push(`${modelName}_metadata.json`);

		// Save training summary if available
		if (metadata.trainingSummary) {
			const summaryPath = `${modelPath}_summary.json`;
			await fs.writeFile(
				summaryPath,
				JSON.stringify(metadata.trainingSummary, null, 2),
			);
			savedFiles.push(`${modelName}_summary.json`);
		}

		return NextResponse.json({
			success: true,
			modelName,
			exportPath: `exported_models/${modelName}`,
			files: savedFiles,
			metadata: enrichedMetadata,
		});
	} catch (error) {
		console.error('Model export error:', error);
		return NextResponse.json(
			{
				error: `Export failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			},
			{ status: 500 },
		);
	}
}

// GET: List exported models
export async function GET() {
	try {
		const exportDir = path.join(process.cwd(), 'exported_models');

		// Create directory if it doesn't exist
		try {
			await fs.access(exportDir);
		} catch {
			await fs.mkdir(exportDir, { recursive: true });
			return NextResponse.json({ models: [] });
		}

		const files = await fs.readdir(exportDir);
		const modelFiles = files.filter((file) => file.endsWith('_metadata.json'));

		const models = await Promise.all(
			modelFiles.map(async (file) => {
				try {
					const filePath = path.join(exportDir, file);
					const content = await fs.readFile(filePath, 'utf-8');
					const metadata = JSON.parse(content);

					const stats = await fs.stat(filePath);

					return {
						name: metadata.modelName || file.replace('_metadata.json', ''),
						metadata,
						exportedAt: metadata.exportedAt,
						size: stats.size,
						files: metadata.files || [],
					};
				} catch (error) {
					console.error(`Error reading model metadata ${file}:`, error);
					return null;
				}
			}),
		);

		// Filter out failed reads and sort by export date
		const validModels = models
			.filter((model) => model !== null)
			.sort(
				(a, b) =>
					new Date(b!.exportedAt).getTime() - new Date(a!.exportedAt).getTime(),
			);

		return NextResponse.json({ models: validModels });
	} catch (error) {
		console.error('Model listing error:', error);
		return NextResponse.json(
			{ error: 'Failed to list exported models' },
			{ status: 500 },
		);
	}
}
