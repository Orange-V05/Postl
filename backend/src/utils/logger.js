export function createLogger(scope = 'app') {
  const format = (level, message, meta = {}) => {
    const safeMeta = sanitizeMeta(meta);
    return JSON.stringify({
      ts: new Date().toISOString(),
      level,
      scope,
      message,
      ...safeMeta,
    });
  };

  return {
    info: (message, meta) => console.log(format('info', message, meta)),
    warn: (message, meta) => console.warn(format('warn', message, meta)),
    error: (message, meta) => console.error(format('error', message, meta)),
    debug: (message, meta) => {
      if (process.env.NODE_ENV !== 'production') console.log(format('debug', message, meta));
    },
  };
}

const SECRET_KEYS = [/token/i, /secret/i, /key/i, /authorization/i, /credential/i, /password/i];

function sanitizeMeta(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeMeta);
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SECRET_KEYS.some((pattern) => pattern.test(key))) {
      out[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      out[key] = sanitizeMeta(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}
