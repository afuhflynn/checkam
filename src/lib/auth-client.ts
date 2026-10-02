import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { appUrl } from "./app-url";

export const authClient = createAuthClient({
  baseURL: appUrl(),
  plugins: [emailOTPClient()],
});
