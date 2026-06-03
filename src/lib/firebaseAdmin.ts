import admin from 'firebase-admin';

function trimOuterQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizePrivateKeyNewlines(raw: string) {
  const keyLabel = '"private_key"';
  const labelIndex = raw.indexOf(keyLabel);
  if (labelIndex === -1) {
    return raw;
  }

  const colonIndex = raw.indexOf(':', labelIndex);
  if (colonIndex === -1) {
    return raw;
  }

  const openingQuoteIndex = raw.indexOf('"', colonIndex);
  if (openingQuoteIndex === -1) {
    return raw;
  }

  const closingQuoteIndex = raw.indexOf('"', openingQuoteIndex + 1);
  if (closingQuoteIndex === -1) {
    return raw;
  }

  const privateKeyValue = raw.slice(openingQuoteIndex + 1, closingQuoteIndex);
  if (!privateKeyValue.includes('\n')) {
    return raw;
  }

  const escapedKey = privateKeyValue.replace(/\r?\n/g, '\\n');
  return `${raw.slice(0, openingQuoteIndex + 1)}${escapedKey}${raw.slice(closingQuoteIndex)}`;
}

function parseJson(raw: string) {
  return JSON.parse(raw) as admin.ServiceAccount;
}

export function parseFirebaseServiceAccountKey(rawKey: string): admin.ServiceAccount & { project_id?: string; private_key?: string; client_email?: string } {
  const raw = trimOuterQuotes(rawKey);
  const attempts: Array<{ mode: string; error: unknown }> = [];

  try {
    return parseJson(raw);
  } catch (error) {
    attempts.push({ mode: 'direct-json', error });
  }

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return parseJson(decoded);
  } catch (error) {
    attempts.push({ mode: 'base64', error });
  }

  try {
    const fixed = raw.replaceAll('\\n', '\n');
    return parseJson(fixed);
  } catch (error) {
    attempts.push({ mode: 'escaped-newlines', error });
  }

  try {
    const normalized = normalizePrivateKeyNewlines(raw);
    return parseJson(normalized);
  } catch (error) {
    attempts.push({ mode: 'normalize-private-key-newlines', error });
  }

  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Attempts:', attempts);
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON, base64 JSON, or newline-escaped JSON. ' +
      'Store the full service account JSON on a single line with escaped \\n values inside private_key, or use a base64-encoded JSON string.'
  );
}

export function getFirebaseAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    const message = 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.';
    console.error(message);
    throw new Error(message);
  }

  const serviceAccount = parseFirebaseServiceAccountKey(rawKey);
  const projectId = serviceAccount.project_id || serviceAccount.projectId;

  const privateKey = serviceAccount.private_key ?? '';
  const keyDiagnostics = {
    client_email: serviceAccount.client_email ?? 'missing',
    project_id: projectId ?? 'missing',
    private_key_length: privateKey.length,
    has_escaped_newline: privateKey.includes('\\n'),
    has_actual_newline: privateKey.includes('\n'),
  };
  console.log('Firebase Admin service account parsed successfully:', keyDiagnostics);

  const initConfig: admin.AppOptions = {
    credential: admin.credential.cert(serviceAccount),
  };

  if (projectId) {
    initConfig.projectId = projectId;
  }

  try {
    const app = admin.initializeApp(initConfig);
    console.log('Firebase Admin SDK initialized. projectId=', projectId);
    return app;
  } catch (error: unknown) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw error;
  }
}
