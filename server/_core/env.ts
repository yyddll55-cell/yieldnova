export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminWalletAddress: (process.env.ADMIN_WALLET_ADDRESS ?? "").toLowerCase(),
  // Master admin credentials (hardcoded for security)
  adminUsername: process.env.ADMIN_USERNAME ?? "master_admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "YieldNova2026!#",
  adminOTPSecretBackup: process.env.ADMIN_OTP_SECRET_BACKUP ?? "YNOVANEVADIY360D",
};
