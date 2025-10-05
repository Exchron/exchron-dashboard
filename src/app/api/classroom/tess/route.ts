import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
	try {
		const filePath = path.join(
			process.cwd(),
			'data',
			'TESS-Classroom-Data.csv',
		);
		const data = await fs.readFile(filePath, 'utf-8');
		return new NextResponse(data, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
			},
		});
	} catch (err: any) {
		return NextResponse.json(
			{ error: 'Failed to load TESS dataset', details: err?.message },
			{ status: 500 },
		);
	}
}
