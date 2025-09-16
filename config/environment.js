import Constants from "expo-constants";
// Environment-specific configuration
const ENV = {
	development: {
		WEATHER_API_KEY: "78861b0d63e52c00ce007d16888c38d1",
		WEATHER_BASE_URL: "https://api.openweathermap.org/data/2.5",
		MAPBOX_API_KEY: "dev_mapbox_key_here",
		MAPBOX_BASE_URL: "https://api.mapbox.com",
		SOCIAL_API_BASE_URL: "http://localhost:3000/api",
		DEBUG_API_CALLS: true,
	},
	staging: {
		WEATHER_API_KEY: "78861b0d63e52c00ce007d16888c38d1",
		WEATHER_BASE_URL: "https://api.openweathermap.org/data/2.5",
		MAPBOX_API_KEY: "staging_mapbox_key_here",
		MAPBOX_BASE_URL: "https://api.mapbox.com",
		SOCIAL_API_BASE_URL: "https://staging-api.example.com/api",
		DEBUG_API_CALLS: false,
	},
	production: {
		WEATHER_API_KEY: Constants.expoConfig?.extra?.weatherApiKey,
		WEATHER_BASE_URL: "https://api.openweathermap.org/data/2.5",
		MAPBOX_API_KEY: Constants.expoConfig?.extra?.mapboxApiKey,
		MAPBOX_BASE_URL: "https://api.mapbox.com",
		SOCIAL_API_BASE_URL: "https://api.example.com/api",
		DEBUG_API_CALLS: false,
	},
};
// Get current environment
const getEnvironment = () => {
	if (__DEV__) return "development";

	const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;
	if (releaseChannel === "staging") return "staging";

	return "production";
};
// Export configuration for current environment
export const config = ENV[getEnvironment()];
// Validation helper
export const validateConfig = () => {
	const requiredKeys = [
		"WEATHER_API_KEY",
		"WEATHER_BASE_URL",
		"MAPBOX_API_KEY",
		"MAPBOX_BASE_URL",
	];
	const missingKeys = requiredKeys.filter((key) => !config[key]);

	if (missingKeys.length > 0) {
		console.error("❌ Missing required configuration keys:", missingKeys);
		throw new Error(`Missing configuration: ${missingKeys.join(", ")}`);
	}
	console.log("✅ Configuration validation passed");
};
