import Auth from "../app/module/auth/Auth";
import Admin from "../app/module/admin/Admin";
import config from "../config";
import { EnumUserRole } from "../util/enum";
import { logger, errorLogger } from "../util/logger";

const seedAdmin = async () => {
  const { name, email, password } = config.admin;

  if (!email || !password) {
    logger.info("Admin seed skipped: ADMIN_EMAIL/ADMIN_PASSWORD not set");
    return;
  }

  try {
    const existingAuth = await Auth.findOne({ email });

    if (existingAuth) {
      logger.info(`Admin already exists: ${email}`);
      return;
    }

    // Saved through the model so the pre-save hook hashes the password.
    const auth = await Auth.create({
      name,
      email,
      password,
      role: EnumUserRole.ADMIN,
      isVerified: true,
      isActive: true,
      isBlocked: false,
    });

    await Admin.create({
      authId: auth._id,
      name,
      email,
    });

    logger.info(`Admin seeded successfully: ${email}`);
  } catch (err) {
    errorLogger.error("Admin Seed Error:", err);
  }
};

export = seedAdmin;
