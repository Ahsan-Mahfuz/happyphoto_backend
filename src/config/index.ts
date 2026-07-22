import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

const validateConfig = (config: any) => {
  const missing: string[] = [];

  if (!config.database_url) missing.push("MONGO_URL");
  if (!config.jwt.secret) missing.push("JWT_SECRET");
  if (!config.jwt.refresh_secret) missing.push("JWT_REFRESH_SECRET");
  if (!config.jwt.expires_in) missing.push("JWT_EXPIRES_IN");
  if (!config.jwt.refresh_expires_in) missing.push("JWT_REFRESH_EXPIRES_IN");
  if (!config.stripe.stripe_secret_key) missing.push("STRIPE_SECRET_KEY");
  if (!config.stripe.stripe_webhook_secret)
    missing.push("STRIPE_WEBHOOK_SECRET");
  if (!config.smtp.smtp_host) missing.push("SMTP_HOST");
  if (!config.smtp.smtp_mail) missing.push("SMTP_MAIL");
  if (!config.smtp.smtp_password) missing.push("SMTP_PASSWORD");

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  base_url: process.env.BASE_URL,
  database_url: process.env.MONGO_URL,
  allowed_origins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || "10",
  // Requests per IP per hour across the unauthenticated /auth routes. Kept low by
  // default; raise it only for automated test runs against a throwaway environment.
  auth_rate_limit: Number(process.env.AUTH_RATE_LIMIT) || 10,
  // Full origin, not a bind address — Stripe rejects redirect URLs without a scheme.
  merchant_dashboard_url: (
    process.env.MERCHANT_DASHBOARD_URL || "http://localhost:50522"
  ).replace(/\/+$/, ""),
  admin: {
    name: process.env.ADMIN_NAME || "Super Admin",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  auth_level: {
    all: ["USER", "PROPERTY_HOST", "DRIVER", "MERCHANT", "ADMIN"],
    user: ["USER", "ADMIN"],
    property_host: ["PROPERTY_HOST", "ADMIN"],
    driver: ["DRIVER", "ADMIN"],
    merchant: ["MERCHANT", "ADMIN"],
    admin: ["ADMIN"],
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refresh_secret: process.env.JWT_REFRESH_SECRET,
    expires_in: process.env.JWT_EXPIRES_IN,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  smtp: {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_service: process.env.SMTP_SERVICE,
    smtp_mail: process.env.SMTP_MAIL,
    smtp_password: process.env.SMTP_PASSWORD,
    NAME: process.env.SERVICE_NAME,
  },
  cloudinary: {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    cloudinary_url: process.env.CLOUDINARY_URL,
  },
  stripe: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    stripe_webhook_secret_live: process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  },
  // Optional — crash/error reporting. Get a DSN free at sentry.io. Left
  // unset, Sentry.init() below just no-ops (not required, unlike Stripe).
  sentry_dsn: process.env.SENTRY_DSN,
  variables: {
    email_temp_image: process.env.EMAIL_TEMP_IMAGE,
    email_temp_text_secondary_color:
      process.env.EMAIL_TEMP_TEXT_SECONDARY_COLOR,
  },
};

// Validate configuration
validateConfig(config);

export = config;
