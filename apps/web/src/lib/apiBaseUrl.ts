const FALLBACK_URL = "http://localhost:4000";

const trim = (value?: string | null) => value?.trim() ?? "";

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

const resolveFromEnv = () => {
  const envUrl = trim(process.env.NEXT_PUBLIC_API_URL);
  return envUrl ? normalizeBaseUrl(envUrl) : null;
};

const resolvePortPreference = () => {
  const explicitPort = trim(process.env.NEXT_PUBLIC_API_PORT);
  if (explicitPort) {
    return explicitPort;
  }
  return "4000";
};

const resolveFromWindow = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const desiredPort = resolvePortPreference();

    if (desiredPort) {
      url.port = desiredPort;
    }

    return normalizeBaseUrl(url.origin);
  } catch {
    return null;
  }
};

let cachedBaseUrl: string | null = null;

export const getApiBaseUrl = () => {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  const envUrl = resolveFromEnv();
  if (envUrl) {
    cachedBaseUrl = envUrl;
    return cachedBaseUrl;
  }

  const windowUrl = resolveFromWindow();
  if (windowUrl) {
    cachedBaseUrl = windowUrl;
    return cachedBaseUrl;
  }

  cachedBaseUrl = FALLBACK_URL;
  return cachedBaseUrl;
};

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl();
  if (!path.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}${path}`;
};
