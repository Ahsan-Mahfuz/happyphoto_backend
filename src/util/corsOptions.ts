import config from "../config";

// Allowed origins are configured via the ALLOWED_ORIGINS env var
// (comma-separated list of full origins, e.g. "https://app.example.com,https://admin.example.com").
const allowedOrigins: string[] = config.allowed_origins;

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    // Allow non-browser clients (no Origin header) and server-to-server calls.
    if (!origin) return callback(null, true);

    // Exact-origin match only — no loose prefix matching.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // With no origins configured, allow all in non-production to ease local dev.
    if (allowedOrigins.length === 0 && config.env !== "production") {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

export = corsOptions;
