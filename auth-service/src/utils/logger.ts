const SENSITIVE_KEYS = new Set([
  'password',
  'contrasena',
  'contraseña',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'passwordhash',
  'hash',
  'cookie',
  'jwt'
]);

function sanitizeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
  if (SENSITIVE_KEYS.has(normalizedKey) || Array.from(SENSITIVE_KEYS).some(k => normalizedKey.includes(k))) {
    return '[REDACTED]';
  }

  if (typeof value === 'object') {
    return sanitizeObject(value);
  }

  // Also redact strings looking like Bearer tokens or JWTs
  if (typeof value === 'string') {
    if (/^Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/i.test(value)) {
      return 'Bearer [REDACTED_JWT]';
    }
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return '[REDACTED_JWT]';
    }
  }

  return value;
}

export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' ? sanitizeObject(item) : sanitizeValue('', item)));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(key, val);
    }
    return sanitized;
  }

  return obj;
}

export const logger = {
  info: (message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.log(`[${timestamp}] [INFO] ${message}`, JSON.stringify(sanitizeObject(meta)));
    } else {
      console.log(`[${timestamp}] [INFO] ${message}`);
    }
  },
  warn: (message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.warn(`[${timestamp}] [WARN] ${message}`, JSON.stringify(sanitizeObject(meta)));
    } else {
      console.warn(`[${timestamp}] [WARN] ${message}`);
    }
  },
  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    if (error instanceof Error) {
      console.error(`[${timestamp}] [ERROR] ${message} - ${error.name}: ${error.message}`);
    } else if (error !== undefined) {
      console.error(`[${timestamp}] [ERROR] ${message}`, JSON.stringify(sanitizeObject(error)));
    } else {
      console.error(`[${timestamp}] [ERROR] ${message}`);
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'production') return;
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.debug(`[${timestamp}] [DEBUG] ${message}`, JSON.stringify(sanitizeObject(meta)));
    } else {
      console.debug(`[${timestamp}] [DEBUG] ${message}`);
    }
  }
};
