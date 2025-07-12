// src/app/api/analyze-gameplay/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { runFlow } from '@genkit-ai/flow';
import { gameplayAnalysisFlow } from '@/genkit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

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

  } catch (error: any) { // Line 31: Add eslint-disable-next-line
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('API Route Error /analyze-gameplay:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: 'Failed to analyze gameplay via AI.', details: (error as any).message }, { status: 500 });
  }
}