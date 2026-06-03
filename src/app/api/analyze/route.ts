import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

const firebaseAdminApp = getFirebaseAdminApp();
const firestore = firebaseAdminApp.firestore();

function createGeminiPrompt(userId: string, gameplayText?: string) {
  return `Analyze the following gameplay for user ${userId}. Provide a comprehensive analysis, actionable suggestions for improvement, and specific errors detected.${gameplayText ? ` Gameplay Text:\n"${gameplayText}"` : ' Gameplay Video:'}`;
}

// Interacts with the content generation engine using a file workspace reference URI
interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    fileUri: string;
    mimeType: string;
  };
}

async function callGemini(prompt: string, videoFileUri?: string, videoMimeType?: string) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Server configuration error: GOOGLE_API_KEY environment variable is missing. Get your key from https://aistudio.google.com/apikey');
  }

  const parts: GeminiPart[] = [{ text: prompt }];
  
  if (videoFileUri) {
    parts.push({
      fileData: {
        fileUri: videoFileUri,
        mimeType: videoMimeType || 'video/mp4'
      }
    });
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

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server configuration error: GOOGLE_API_KEY environment variable is missing. Get your key from https://aistudio.google.com/apikey' }, { status: 500 });
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

  let videoFileUri: string | undefined;
  let videoMimeType: string | undefined;

  try {
    // Step 1: Securely upload to Google Files API if a video file exists
    if (videoFileInput) {
      videoMimeType = videoFileInput.type || 'video/mp4';
      console.log(`Initiating video upload: ${videoFileInput.name} (${videoFileInput.size} bytes, ${videoMimeType})`);
      
      // Initialize a resumable upload channel
      const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': videoFileInput.size.toString(),
          'X-Goog-Upload-Header-Content-Type': videoMimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: { displayName: videoFileInput.name || 'gameplay-video' }
        }),
      });

      if (!initResponse.ok) {
        const initErrorText = await initResponse.text();
        console.error('Upload init error response:', initResponse.status, initErrorText);
        throw new Error(`Failed to initialize file upload pipeline: ${initResponse.status} ${initResponse.statusText}. Details: ${initErrorText}`);
      }

      let uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        throw new Error('Failed to capture reference upload location from response headers.');
      }

      console.log('Upload session initialized, URL length:', uploadUrl.length);

      // CRITICAL FIX: The generated upload session URL may not include the API key.
      // We must append the API key parameter to ensure authentication on the actual file upload.
      if (!uploadUrl.includes('key=')) {
        uploadUrl = uploadUrl.includes('?') ? `${uploadUrl}&key=${apiKey}` : `${uploadUrl}?key=${apiKey}`;
        console.log('API key appended to upload URL');
      }

      // Stream the raw ArrayBuffer directly to the fully authorized upload session URL
      const arrayBuffer = await videoFileInput.arrayBuffer();
      console.log(`Uploading video payload: ${arrayBuffer.byteLength} bytes`);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
          'Content-Type': videoMimeType,
        },
        body: Buffer.from(arrayBuffer),
      });

      if (!uploadResponse.ok) {
        const uploadErrorText = await uploadResponse.text();
        console.error('Upload error response:', uploadResponse.status, uploadErrorText);
        throw new Error(`Failed to transmit video payload: ${uploadResponse.status} ${uploadResponse.statusText}. Details: ${uploadErrorText}`);
      }

      const fileMetadata = await uploadResponse.json();
      console.log('File metadata received:', fileMetadata);
      
      if (!fileMetadata.file || !fileMetadata.file.uri) {
        console.error('Unexpected file metadata structure:', fileMetadata);
        throw new Error('File upload response missing file.uri in metadata.');
      }
      
      videoFileUri = fileMetadata.file.uri;
      const remoteFileName = fileMetadata.file.name; // Format: "files/..."

      console.log('Video uploaded successfully:', videoFileUri);

      // Step 2: Poll Google's worker state until processing transitions out of 'PROCESSING'
      let fileState = fileMetadata.file.state;
      let pollAttempts = 0;
      const maxPollAttempts = 60; // Max 3 minutes of polling (60 * 3 seconds)
      
      while (fileState === 'PROCESSING' && pollAttempts < maxPollAttempts) {
        pollAttempts++;
        console.log(`Polling file state (attempt ${pollAttempts})...`);
        
        // Yield thread execution for 3 seconds before requesting an updated status check
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        const checkUrl = `https://generativelanguage.googleapis.com/v1beta/${remoteFileName}?key=${apiKey}`;
        const checkResponse = await fetch(checkUrl);

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          fileState = checkData.state;
          console.log(`File state updated to: ${fileState}`);
          
          if (fileState === 'FAILED') {
            console.error('File processing failed:', checkData);
            throw new Error('Video parsing encountered a terminal failure state.');
          }
        } else {
          console.warn(`Status check returned ${checkResponse.status}, continuing...`);
        }
      }
      
      if (pollAttempts >= maxPollAttempts) {
        console.warn('File processing polling timed out after 3 minutes');
      }
    }

    const prompt = createGeminiPrompt(userId, text ?? undefined);
    
    // Step 3: Run causal inference with the uploaded file path reference
    const analysisResult = await callGemini(prompt, videoFileUri, videoMimeType);

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