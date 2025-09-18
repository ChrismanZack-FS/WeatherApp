import axios from "axios";
import locationDebugger from "../utils/debugLocation";
import { WeatherLocation } from "./debugLocationService";
interface WeatherDebugInfo {
	requestUrl: string;
	requestParams: any;
	responseData?: any;
	error?: string;
	coordinatesMismatch?: boolean;
}
class DebugWeatherService {
	private apiKey: string;
	private baseUrl: string = "https://api.openweathermap.org/data/2.5";
	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}
	async getWeatherWithDebug(location: WeatherLocation): Promise<any> {
		const { latitude, longitude } = location.coordinates;

		// Log the weather request
		locationDebugger.logLocationEvent("weather_request", location.coordinates, {
			address: location.address,
			errors: [`Requesting weather for: ${latitude}, ${longitude}`],
		});
		const debugInfo: WeatherDebugInfo = {
			requestUrl: `${this.baseUrl}/weather`,
			requestParams: {
				lat: latitude,
				lon: longitude,
				appid: this.apiKey,
				units: "metric",
			},
		};
		try {
			const response = await axios.get(debugInfo.requestUrl, {
				params: debugInfo.requestParams,
				timeout: 10000,
			});
			debugInfo.responseData = response.data;
			// Check for coordinate mismatch
			const responseCoords = {
				latitude: response.data.coord.lat,
				longitude: response.data.coord.lon,
			};
			const coordinateDistance = this.calculateDistance(
				location.coordinates,
				responseCoords
			);
			// Flag if weather data coordinates are significantly different
			debugInfo.coordinatesMismatch = coordinateDistance > 10000; // 10km threshold
			locationDebugger.logLocationEvent("weather_response", responseCoords, {
				address: response.data.name,
				weatherData: {
					location: { name: response.data.name },
					current: { description: response.data.weather[0].description },
				},
				errors: debugInfo.coordinatesMismatch
					? [
							`WARNING: Coordinate mismatch! Requested: ${latitude}, ${longitude} Got: ${
								responseCoords.latitude
							}, ${responseCoords.longitude} (${Math.round(
								coordinateDistance / 1000
							)}km difference)`,
					  ]
					: [],
			});
			// Enhanced weather data with debug info
			return {
				...response.data,
				debug: {
					...debugInfo,
					coordinateDistance: Math.round(coordinateDistance),
					requestedCoordinates: location.coordinates,
					responseCoordinates: responseCoords,
				},
			};
		} catch (error) {
			let errorMessage = "Weather request failed";
			let errorResponse, errorRequest;
			if (error instanceof Error) {
				errorMessage = `Weather request failed: ${error.message}`;
			} else if (typeof error === "string") {
				errorMessage = `Weather request failed: ${error}`;
			}
			debugInfo.error = errorMessage;

			locationDebugger.logLocationEvent("weather_error", location.coordinates, {
				errors: [errorMessage],
			});
			// Try to provide helpful debugging information
			if (typeof error === "object" && error !== null && "response" in error) {
				errorResponse = (error as any).response;
				console.error("Weather API Error Response:", {
					status: errorResponse?.status,
					data: errorResponse?.data,
					headers: errorResponse?.headers,
				});
			} else if (
				typeof error === "object" &&
				error !== null &&
				"request" in error
			) {
				errorRequest = (error as any).request;
				console.error("Weather API No Response:", errorRequest);
			} else {
				console.error("Weather API Request Setup Error:", errorMessage);
			}
			throw error instanceof Error ? error : new Error(errorMessage);
		}
	}
	private calculateDistance(
		coord1: { latitude: number; longitude: number },
		coord2: { latitude: number; longitude: number }
	): number {
		const R = 6371000; // Earth's radius in meters
		const dLat = this.toRadians(coord2.latitude - coord1.latitude);
		const dLon = this.toRadians(coord2.longitude - coord1.longitude);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(this.toRadians(coord1.latitude)) *
				Math.cos(this.toRadians(coord2.latitude)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}
	private toRadians(degrees: number): number {
		return degrees * (Math.PI / 180);
	}
}
export default DebugWeatherService;
