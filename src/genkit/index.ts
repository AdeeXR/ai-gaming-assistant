    // src/genkit/index.ts
    // This file defines your Genkit AI flows, which run on the server-side.

    import { defineFlow, generate } from '@genkit-ai/flow';
    import { gemini20Flash } from '@genkit-ai/google-cloud'; // Changed to use gemini20Flash
    import * as z from 'zod';

    // Initialize Firebase Admin SDK for server-side authentication with GCP services.
    // This is crucial for Genkit when deployed or running locally with Firebase credentials.
    import admin from 'firebase-admin';
    import { credential } from 'firebase-admin';

    if (!admin.apps.length) {
      try {
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
        admin.initializeApp({
          credential: credential.cert(serviceAccountJson),
        });
        console.log("Firebase Admin SDK initialized for Genkit.");
      } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK for Genkit:", error);
      }
    }

    // Define the expected input schema for the AI flow using Zod for validation.
    const GameplayAnalysisInputSchema = z.object({
      gameplayText: z.string().describe('The textual description or log of gameplay for analysis.'),
      userId: z.string().optional().describe('The ID of the user submitting the gameplay.'),
    });

    // Define the expected output schema for the AI flow.
    // This guides the LLM to produce structured JSON and helps with type safety.
    const GameplayAnalysisOutputSchema = z.object({
      analysis: z.string().describe('A comprehensive analysis of the gameplay.'),
      suggestions: z.array(z.string()).describe('Actionable suggestions for improvement.'),
      errorsDetected: z.array(z.string()).describe('Specific errors or misplays identified.'),
    });

    // Define the core Genkit AI flow for gameplay analysis.
    export const gameplayAnalysisFlow = defineFlow(
      {
        name: 'gameplayAnalysisFlow',
        inputSchema: GameplayAnalysisInputSchema,
        outputSchema: GameplayAnalysisOutputSchema,
      },
      async (input) => {
        const { gameplayText, userId } = input;

        const promptText = `Analyze the following gameplay log/description for a gaming/esports player.
        Focus on identifying patterns, specific errors, and providing actionable suggestions for improvement.
        Consider the context of a competitive gaming environment.
        ${userId ? `This analysis is for user ID: ${userId}. Try to tailor advice as if speaking directly to them.` : ''}

        Gameplay:
        "${gameplayText}"

        Provide a structured response in JSON format with the following keys:
        "analysis": A general overview of the gameplay and its patterns.
        "suggestions": An array of specific, actionable tips to improve.
        "errorsDetected": An array of clear, identified mistakes or sub-optimal actions.`;

        // Call the Gemini 2.0 Flash model via Genkit's 'generate' function.
        const llmResponse = await generate({
          model: gemini20Flash, // Using gemini20Flash
          prompt: promptText,
          config: {
            temperature: 0.7,
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
        });

        try {
          const parsedResponse = JSON.parse(llmResponse.text());
          return parsedResponse;
        } catch (parseError) {
          console.error("Error parsing AI response JSON:", parseError);
          return {
            analysis: "Failed to parse AI analysis. Please try again or refine your input.",
            suggestions: [],
            errorsDetected: [`Invalid AI response format: ${llmResponse.text()}`],
          };
        }
      }
    );