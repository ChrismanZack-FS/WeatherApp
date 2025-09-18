import * as functions from "firebase-functions";
interface AppConfig {
	openweather: {
		apiKey: string;
		baseUrl: string;
	};
	mapbox: {
		apiKey: string;
		baseUrl: string;
	};
	webhook: {
		secret: string;
	};
	app: {
		environment: string;
		version: string;
	};
}
export function getConfig(): AppConfig {
	return {
		openweather: {
			apiKey: functions.config().openweather.api_key,
			baseUrl: "https://api.openweathermap.org/data/2.5",
		},
		mapbox: {
			apiKey: functions.config().mapbox.api_key,
			baseUrl: "https://api.mapbox.com/geocoding/v5/mapbox.places",
		},
		webhook: {
			secret: functions.config().webhook.secret,
		},
		app: {
			environment: functions.config().app?.environment || "development",
			version: functions.config().app?.version || "1.0.0",
		},
	};
}
// Validation helper
export function validateConfig(): void {
	const config = getConfig();

	const required = ["openweather.apiKey", "mapbox.apiKey", "webhook.secret"];
	for (const key of required) {
		const value = key.split(".").reduce((obj, k) => obj?.[k], config as any);
		if (!value) {
			throw new Error(`Missing required configuration: ${key}`);
		}
	}
}
