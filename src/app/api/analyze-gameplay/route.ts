// src/app/api/analyze-gameplay/route.ts
// This API route handles requests for AI gameplay analysis using direct Gemini API calls.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Import authOptions from the dedicated configuration file

export async function POST(req: NextRequest) {
  // Use getServerSession with the imported authOptions to get the current user session
  const session = await getServerSession(authOptions);

  // Check for user authentication
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { gameplayText } = await req.json();
  const userId = session.user.id; // Not directly used in the prompt for Gemini, but kept for context if needed

  // Validate input
  if (!gameplayText) {
    return NextResponse.json({ error: 'Gameplay text is required for analysis.' }, { status: 400 });
  }

  try {
    // Construct the prompt for the Gemini model
    const prompt = `Analyze the following gameplay text for user ${userId}. Provide a comprehensive analysis, actionable suggestions for improvement, and specific errors detected.

    Gameplay Text:
    "${gameplayText}"

    Format your response as a JSON object with the following structure:
    {
      "analysis": "string",
      "suggestions": ["string", "string", ...],
      "errorsDetected": ["string", "string", ...]
    }
    `;

    // Prepare the chat history for the Gemini API request
    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    // Define the payload for the Gemini API request, including the response schema
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "analysis": { "type": "STRING" },
            "suggestions": { "type": "ARRAY", "items": { "type": "STRING" } },
            "errorsDetected": { "type": "ARRAY", "items": { "type": "STRING" } }
          },
          "propertyOrdering": ["analysis", "suggestions", "errorsDetected"]
        }
      }
    };

    // IMPORTANT: Leave apiKey as an empty string. Canvas provides it at runtime.
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Make the fetch call to the Gemini API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Parse the response from the Gemini API
    const result = await response.json();

    // Check if the response structure is as expected and extract the text
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      const jsonText = result.candidates[0].content.parts[0].text;
      const analysisResult = JSON.parse(jsonText); // Parse the JSON string

      // Return the AI analysis result
      return NextResponse.json(analysisResult, { status: 200 });
    } else {
      // Handle cases where the response structure is unexpected or content is missing
      console.error('Gemini API response structure unexpected:', result);
      return NextResponse.json({ error: 'Failed to get AI analysis: Unexpected API response format.' }, { status: 500 });
    }

  } catch (error: unknown) {
    // Handle any errors during the API call or parsing
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Route Error /analyze-gameplay:', error);
    return NextResponse.json({ error: 'Failed to analyze gameplay via AI.', details: errorMessage }, { status: 500 });
  }
}