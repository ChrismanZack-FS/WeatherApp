const config = {
	apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
	appEnv: process.env.EXPO_PUBLIC_APP_ENV || "development",
	enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === "true",
	platform: process.env.EXPO_PUBLIC_PLATFORM,
};
export default config;
