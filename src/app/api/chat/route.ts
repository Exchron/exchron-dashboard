import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// WARNING: Hardcoded API key for Gemini. For production, use environment variables instead.
const genAI = new GoogleGenerativeAI('AIzaSyBERDBWS_BUk6JbFwq0B8rubA8kJaDPTUA');

export async function POST(req: NextRequest) {
	try {
		const { message } = await req.json();

		if (!message) {
			return NextResponse.json(
				{ error: 'Message is required' },
				{ status: 400 },
			);
		}

		// Use stable model
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		// System instruction with full application context for Exchron
		const systemInstruction = `You are an AI assistant specialized in the Exchron dashboard application. Answer all questions very briefly (one or two sentences). Exchron is a Next.js 15 machine learning dashboard with two modes: Playground and Classroom. Playground has tabs Overview (model architecture and performance), Data Input (manual entry and file upload), Results (analysis outputs), and Enhance (tools to improve model results). Classroom has tabs Data Input, Model Selection, Train & Validate, and Test & Export. The app uses a light theme with card-based UI, interactive sliders, and persistent mode selection via localStorage. Routing is under /dashboard/playground/* and /dashboard/classroom/*. Components include DashboardLayout, TabNavigation, and individual page components in src/app/dashboard. UI primitives use Card, CardTitle, and CardContent. Provide concise answers about any UI component, routing, data flow, or feature of this application. For unrelated questions, guide users to ask about Exchron features.`;
		// Start chat and prepend system instruction to user's message
		const chat = model.startChat({
			history: [],
			generationConfig: { maxOutputTokens: 1000 },
		});
		const result = await chat.sendMessage(`${systemInstruction}\n\n${message}`);
		const response = await result.response;
		const text = response.text();

		return NextResponse.json({ response: text });
	} catch (error) {
		console.error('Chat API error:', error);
		return NextResponse.json(
			{ error: 'Failed to get response from AI' },
			{ status: 500 },
		);
	}
}
