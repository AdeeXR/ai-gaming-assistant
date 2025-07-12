// src/app/api/analyze-gameplay/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Import 'authConfig' instead of 'authOptions' or 'handler'
import { authConfig } from '../auth/[...nextauth]/route'; // <--- CHANGE THIS IMPORT
import { runFlow } from '@genkit-ai/flow';
import { gameplayAnalysisFlow } from '@/genkit';

export async function POST(req: NextRequest) {
  // Pass authConfig to getServerSession
  const session = await getServerSession(authConfig); // <--- CHANGE THIS LINE

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { gameplayText } = await req.json();
  const userId = session.user.id;

  if (!gameplayText) {
    return NextResponse.json({ error: 'Gameplay text is required for analysis.' }, { status: 400 });
  }

  try {
    const analysisResult = await runFlow(gameplayAnalysisFlow, {
      gameplayText: gameplayText,
      userId: userId,
    });

    return NextResponse.json(analysisResult, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Route Error /analyze-gameplay:', error);
    return NextResponse.json({ error: 'Failed to analyze gameplay via AI.', details: errorMessage }, { status: 500 });
  }
}