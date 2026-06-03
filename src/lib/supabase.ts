import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseBucketNameEnv = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

const supabaseBucketName = supabaseBucketNameEnv;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadVideoFileToSupabase(userId: string, file: File) {
  if (!supabaseBucketName) {
    throw new Error('Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_BUCKET_NAME');
  }

  const supabase = getSupabaseClient();
  const filePath = `${userId}/${Date.now()}_${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(supabaseBucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Supabase file upload failed.');
  }

  const publicUrlResponse = supabase.storage
    .from(supabaseBucketName)
    .getPublicUrl(filePath);

  if (!publicUrlResponse.data?.publicUrl) {
    throw new Error('Failed to generate Supabase public URL.');
  }

  const publicUrl = publicUrlResponse.data.publicUrl;

  return {
    filePath,
    publicUrl,
  };
}

