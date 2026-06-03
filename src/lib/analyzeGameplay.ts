import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { gameMetadata } from '@/lib/gameMetadata';

async function callGemini(parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Server configuration error: GOOGLE_API_KEY environment variable is missing. Get your key from https://aistudio.google.com/apikey');
  }

  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          analysis: { type: 'STRING' },
          suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
          errorsDetected: { type: 'ARRAY', items: { type: 'STRING' } },
          objectives: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        propertyOrdering: ['analysis', 'suggestions', 'errorsDetected', 'objectives']
      }
    }
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  console.log('Calling Gemini API with', parts.length, 'parts');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Gemini API response status:', response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error('Gemini API error response:', text);
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { error: text }; }
    throw new Error(parsed?.error?.message || parsed?.error || `Gemini API returned ${response.status}`);
  }

  const data = await response.json();
  console.log('Gemini API response received, candidates:', data?.candidates?.length);

  if (
    data?.candidates?.length > 0 &&
    data.candidates[0]?.content?.parts?.length > 0
  ) {
    const text = data.candidates[0].content.parts[0].text;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Failed to parse Gemini response as JSON.');
    }
  }

  throw new Error('Unexpected Gemini API response format.');
}

export async function analyzeGameplayHandler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let payloadBody: { gameplayText?: string; gameplayVideoUrl?: string; textInput?: string; gameTitle?: string; gameRole?: string } = {};

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const textInput = formData.get('textInput');
    const gameplayText = formData.get('gameplayText');
    const gameplayVideoUrl = formData.get('gameplayVideoUrl');
    const gameTitle = formData.get('gameTitle');
    const gameRole = formData.get('gameRole');

    if (typeof textInput === 'string' && textInput) payloadBody.textInput = textInput;
    if (typeof gameplayText === 'string' && gameplayText) payloadBody.gameplayText = gameplayText;
    if (typeof gameplayVideoUrl === 'string' && gameplayVideoUrl) payloadBody.gameplayVideoUrl = gameplayVideoUrl;
    if (typeof gameTitle === 'string' && gameTitle) payloadBody.gameTitle = gameTitle;
    if (typeof gameRole === 'string' && gameRole) payloadBody.gameRole = gameRole;
  } else {
    payloadBody = await req.json().catch(() => ({}));
  }

  const gameplayText = payloadBody.gameplayText;
  const gameplayVideoUrl = payloadBody.gameplayVideoUrl;
  const textInput = payloadBody.textInput;
  const gameTitle = payloadBody.gameTitle;
  const gameRole = payloadBody.gameRole;

  if (!gameplayText && !gameplayVideoUrl) {
    return NextResponse.json({ error: 'Gameplay text or video URL is required for analysis.' }, { status: 400 });
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  const metadata = gameTitle ? gameMetadata[gameTitle] : undefined;
  const roleGuidance = metadata?.roleGuidance?.[gameRole ?? ''];

  const promptLines: string[] = [
    `Analyze the following gameplay for user ${session.user.id}. Provide a comprehensive analysis, actionable suggestions for improvement, and specific errors detected. Also, generate 3-5 specific, actionable objectives that the player should focus on to improve their gameplay in this scenario.`
  ];

  if (gameTitle) {
    promptLines.push(`Game: ${gameTitle}.`);
    if (metadata) {
      promptLines.push(metadata.description);
      promptLines.push(metadata.guidance);
      if (metadata.objectiveGuidance) {
        promptLines.push(`Objective guidance: ${metadata.objectiveGuidance}`);
      }
    } else {
      promptLines.push('The game title is recognized as an esports title, but detailed metadata is not available for it. Use general competitive esports reasoning.');
    }
  } else {
    promptLines.push('The game title is unspecified. Use general competitive esports reasoning.');
  }

  if (gameRole) {
    promptLines.push(`Role: ${gameRole}. ${roleGuidance ?? `Evaluate the player’s performance in the ${gameRole} role, focusing on role-specific decision-making and team coordination.`}`);
  }

  // Add the analysis instruction
  parts.push({ text: promptLines.join(' ') });

  // Add gameplay text if present
  if (gameplayText) {
    parts.push({ text: `Gameplay Text: ${gameplayText}` });
  }

  // Add video if present
  if (gameplayVideoUrl) {
    try {
      console.log('Fetching video from:', gameplayVideoUrl);
      const videoResponse = await fetch(gameplayVideoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      const arrayBuffer = await videoResponse.arrayBuffer();
      console.log('Video downloaded, size:', arrayBuffer.byteLength);
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      parts.push({ inlineData: { mimeType: 'video/mp4', data: base64 } });
      console.log('Video added to parts, base64 size:', base64.length);
    } catch (error) {
      console.error('Error fetching video:', error);
      const videoErrorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      return NextResponse.json({ error: 'Failed to download video for analysis.', details: videoErrorMsg }, { status: 500 });
    }
  }

  // Add additional text input if present (e.g., Active Objectives)
  if (textInput) {
    parts.push({ text: `Active Objectives: ${textInput}` });
  }

  try {
    const result = await callGemini(parts);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    let msg = 'Unknown analysis error.';
    if (error instanceof Error) {
      msg = error.message;
    } else if (typeof error === 'object' && error !== null) {
      msg = JSON.stringify(error);
    } else {
      msg = String(error);
    }
    console.error('analyzeGameplayHandler error:', msg);
    console.error('Full error object:', error);
    return NextResponse.json({ error: 'Failed to analyze gameplay via AI.', details: msg }, { status: 500 });
  }
}
