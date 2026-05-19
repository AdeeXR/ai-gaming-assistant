import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import admin from 'firebase-admin';
import { authOptions } from '@/lib/auth';

function parseServiceAccountKey(rawKey: string) {
  try {
    return JSON.parse(rawKey);
  } catch (firstError) {
    try {
      const normalized = rawKey.replaceAll('\\n', '\n');
      return JSON.parse(normalized);
    } catch (secondError) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. first error:', firstError, 'second error:', secondError);
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
    }
  }
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.app();
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    const message = 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.';
    console.error(message);
    throw new Error(message);
  }

  const serviceAccount = parseServiceAccountKey(rawKey);
  const projectId = serviceAccount.project_id || serviceAccount.projectId;

  if (!projectId) {
    const message = 'Firebase service account JSON is missing project_id/projectId.';
    console.error(message, 'Parsed service account:', serviceAccount);
    throw new Error(message);
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } catch (error: unknown) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw error;
  }
}

function createGeminiPrompt(userId: string, gameplayText?: string) {
  return `Analyze the following gameplay for user ${userId}. Provide a comprehensive analysis, actionable suggestions for improvement, and specific errors detected.${gameplayText ? ` Gameplay Text:\n"${gameplayText}"` : ' Gameplay Video:'}`;
}

async function callGemini(prompt: string, videoData?: { mimeType: string; data: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server configuration error: GEMINI_API_KEY is missing.');
  }

  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: prompt }];
  if (videoData) {
    parts.push({ inlineData: videoData });
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
        },
        propertyOrdering: ['analysis', 'suggestions', 'errorsDetected'],
      },
    },
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text };
    }
    throw new Error(parsed?.error || `Gemini API returned ${response.status}`);
  }

  const data = await response.json();

  if (data?.candidates?.length > 0 && data.candidates[0]?.content?.parts?.length > 0) {
    const text = data.candidates[0].content.parts[0].text;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Failed to parse Gemini response as JSON.');
    }
  }

  throw new Error('Unexpected Gemini API response format.');
}

const firebaseAdminApp = initializeFirebaseAdmin();
const firestore = firebaseAdminApp.firestore();

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userId = session.user.id;
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Multipart form data required.' }, { status: 400 });
  }

  const formData = await req.formData();
  const textInput = formData.get('textInput') as string | null;
  const gameplayText = formData.get('gameplayText') as string | null;
  const videoFileInput = formData.get('videoFileInput') as File | null;

  const text = gameplayText || textInput;

  if (!text && !videoFileInput) {
    return NextResponse.json({ error: 'Gameplay text or video file is required for analysis.' }, { status: 400 });
  }

  let videoData: { mimeType: string; data: string } | undefined;
  if (videoFileInput) {
    const arrayBuffer = await videoFileInput.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = videoFileInput.type || 'video/mp4';
    videoData = { mimeType, data: base64 };
  }

  const prompt = createGeminiPrompt(userId, text ?? undefined);

  try {
    const analysisResult = await callGemini(prompt, videoData);

    const objectivesCollection = firestore.collection(`users/${userId}/objectives`);
    const analysesCollection = firestore.collection(`users/${userId}/analyses`);

    try {
      const objectiveSnapshot = await objectivesCollection.limit(1).get();
      console.log(`Admin Firestore access verified for users/${userId}/objectives; existing docs: ${objectiveSnapshot.size}`);
    } catch (error: unknown) {
      console.error('Permission denied or Firestore query failure on objectives path:', error);
      throw error;
    }

    const analysisDoc = {
      userId,
      input: {
        gameplayText: text ?? null,
        videoFileName: videoFileInput?.name ?? null,
      },
      analysisResult,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'ai-gameplay-analyze-route',
    };

    let savedAnalysisRef;
    try {
      savedAnalysisRef = await analysesCollection.add(analysisDoc);
      console.log(`Saved analysis under users/${userId}/analyses/${savedAnalysisRef.id}`);
    } catch (error: unknown) {
      console.error('Permission denied or Firestore write failure on analyses path:', error);
      throw error;
    }

    return NextResponse.json(
      {
        ...analysisResult,
        savedAnalysisPath: `users/${userId}/analyses/${savedAnalysisRef.id}`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown analysis error.';
    console.error('analyze route error:', message);
    return NextResponse.json({ error: 'Failed to analyze gameplay via AI.', details: message }, { status: 500 });
  }
}
