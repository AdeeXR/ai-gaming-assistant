// src/app/api/upload-gameplay/route.ts
// This API route handles file uploads (e.g., gameplay replay files) to Supabase Storage
// and saves metadata to Firestore.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

const firebaseAdminApp = getFirebaseAdminApp();
const firestoreDb = firebaseAdminApp.firestore();

// Initialize Supabase client for Storage (using service role for server-side uploads)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME as string;

if (!supabaseUrl || !supabaseServiceRoleKey || !SUPABASE_BUCKET_NAME) {
  const missingVars = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseServiceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !SUPABASE_BUCKET_NAME && 'SUPABASE_BUCKET_NAME',
  ].filter(Boolean);
  const message = `Missing Supabase env var(s): ${missingVars.join(', ')}`;
  console.error(message);
  throw new Error(message);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST(req: NextRequest) {
  // Use getServerSession with the imported authOptions to get the current user session
  const session = await getServerSession(authOptions);

  // Check for user authentication
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userId = session.user.id;

  // Parse the incoming form data to get the uploaded file
  const formData = await req.formData();
  const file = formData.get('gameplayFile') as File | null;

  // Validate file presence
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  // Generate a unique file name for Supabase Storage
  const fileName = `${userId}/${Date.now()}_${file.name}`;
  // Convert file to buffer for Supabase upload
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    // Upload file to Supabase Storage
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false, // Do not overwrite existing files with the same name
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload file to storage: ${uploadError.message}` }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .getPublicUrl(fileName);

    const fileUrl = publicUrlData?.publicUrl;

    if (!fileUrl) {
      return NextResponse.json({ error: 'Failed to get public URL for uploaded file.' }, { status: 500 });
    }

    // Save file metadata to Firestore through the Firebase Admin SDK
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';
    const gameplayLogsCollectionRef = firestoreDb.collection(`artifacts/${appId}/users/${userId}/gameplayLogs`);

    await gameplayLogsCollectionRef.add({
      userId: userId,
      fileName: file.name,
      fileMimeType: file.type,
      fileUrl: fileUrl,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return success response
    return NextResponse.json({ message: 'File uploaded and metadata saved.', fileUrl: fileUrl }, { status: 200 });

  } catch (error: unknown) {
    // Handle any errors during the upload or Firestore save process
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('File upload error:', error);
    return NextResponse.json({ error: `Failed to upload file: ${errorMessage}` }, { status: 500 });
  }
}