import { EnumUserRole } from "../util/enum";

// 2. Automatically derive the AppRole type from the object values
export type AppRole = (typeof EnumUserRole)[keyof typeof EnumUserRole];

export interface AuthUserPayload {
  authId: string;
  userId: string;
  email: string;
  role: AppRole;
  iat?: number;
  exp?: number;
}
