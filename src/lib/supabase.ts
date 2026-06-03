import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseBucketNameEnv = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;

if (!supabaseUrl || !supabaseAnonKey || !supabaseBucketNameEnv) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_BUCKET_NAME');
}

const supabaseBucketName = supabaseBucketNameEnv;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadVideoFileToSupabase(userId: string, file: File) {
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

export { supabase };
