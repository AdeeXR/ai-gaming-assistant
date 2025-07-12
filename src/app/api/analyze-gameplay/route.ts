// src/app/api/analyze-gameplay/route.ts
// This API route handles requests for AI gameplay analysis.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Import authOptions from the dedicated configuration file
import { authOptions } from '@/lib/auth'; // Correct import path for authOptions
import { runFlow } from '@genkit-ai/flow';
import { gameplayAnalysisFlow } from '@/genkit';

export async function POST(req: NextRequest) {
  // Use getServerSession with the imported authOptions to get the current user session
  const session = await getServerSession(authOptions);

  // Check for user authentication
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { gameplayText } = await req.json();
  const userId = session.user.id;

  // Validate input
  if (!gameplayText) {
    return NextResponse.json({ error: 'Gameplay text is required for analysis.' }, { status: 400 });
  }

  try {
    // Run the Genkit AI flow for gameplay analysis
    const analysisResult = await runFlow(gameplayAnalysisFlow, {
      gameplayText: gameplayText,
      userId: userId,
    });

    // Return the AI analysis result
    return NextResponse.json(analysisResult, { status: 200 });

  } catch (error: unknown) {
    // Handle errors during AI analysis
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Route Error /analyze-gameplay:', error);
    return NextResponse.json({ error: 'Failed to analyze gameplay via AI.', details: errorMessage }, { status: 500 });
  }
}