import Auth from "../app/module/auth/Auth";
import Admin from "../app/module/admin/Admin";
import config from "../config";
import { EnumUserRole } from "../util/enum";
import { logger, errorLogger } from "../util/logger";

const seedAdmin = async () => {
  const adminAccounts = [
    {
      name: config.admin.name || "Super Admin",
      email: config.admin.email || "happyphotto.admin@yopmail.com",
      password: config.admin.password || "Admin@1234",
    },
    {
      name: "Admin User",
      email: "admin@happyphoto.com",
      password: "Password123!",
    },
  ];

  try {
    for (const acc of adminAccounts) {
      let existingAuth = await Auth.findOne({ email: acc.email });
      if (!existingAuth) {
        existingAuth = await Auth.create({
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: EnumUserRole.ADMIN,
          isVerified: true,
          isActive: true,
          isBlocked: false,
        });
        await Admin.create({
          authId: existingAuth._id,
          name: acc.name,
          email: acc.email,
        });
        logger.info(`Admin seeded successfully: ${acc.email}`);
      }
    }
  } catch (err) {
    errorLogger.error("Admin Seed Error:", err);
  }
};

export = seedAdmin;
