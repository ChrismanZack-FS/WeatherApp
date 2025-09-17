import createApiClient from "./apiClient";
import { config } from "../config/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
class WeatherService {
	constructor() {
		this.client = createApiClient(config.WEATHER_BASE_URL);
		this.cache = new Map();
		this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
	}
	// Get current weather for coordinates
	async getCurrentWeather(lat, lon, options = {}) {
		const cacheKey = `current_${lat}_${lon}`;

		try {
			// Check cache first
			if (!options.forceRefresh) {
				const cached = await this.getCachedData(cacheKey);
				if (cached) {
					console.log("📦 Returning cached weather data");
					return cached;
				}
			}
			// Make API request
			const response = await this.client.get("/weather", {
				params: {
					lat,
					lon,
					appid: config.WEATHER_API_KEY,
					units: options.units || "metric",
					lang: options.language || "en",
				},
			});
			// Transform API response to our format
			const weatherData = this.transformWeatherResponse(response.data);

			// Cache the result
			await this.setCachedData(cacheKey, weatherData);

			return weatherData;
		} catch (error) {
			console.error("❌ Weather API Error:", error);

			// Try to return cached data on error
			const cached = await this.getCachedData(cacheKey);
			if (cached) {
				console.log("📦 Returning stale cached data due to API error");
				return { ...cached, isStale: true };
			}

			throw this.handleWeatherError(error);
		}
	}
	// Get weather forecast
	async getForecast(lat, lon, options = {}) {
		const cacheKey = `forecast_${lat}_${lon}`;

		try {
			const cached = await this.getCachedData(cacheKey);
			if (cached && !options.forceRefresh) {
				return cached;
			}
			const response = await this.client.get("/forecast", {
				params: {
					lat,
					lon,
					appid: config.WEATHER_API_KEY,
					units: options.units || "metric",
					lang: options.language || "en",
					cnt: options.count || 40, // 5 days, 3-hour intervals
				},
			});
			const forecastData = this.transformForecastResponse(response.data);
			await this.setCachedData(cacheKey, forecastData);

			return forecastData;
		} catch (error) {
			console.error("❌ Forecast API Error:", error);

			const cached = await this.getCachedData(cacheKey);
			if (cached) {
				return { ...cached, isStale: true };
			}

			throw this.handleWeatherError(error);
		}
	}
	// Search weather by city name
	async getWeatherByCity(cityName, options = {}) {
		try {
			const response = await this.client.get("/weather", {
				params: {
					q: cityName,
					appid: config.WEATHER_API_KEY,
					units: options.units || "metric",
					lang: options.language || "en",
				},
			});
			return this.transformWeatherResponse(response.data);
		} catch (error) {
			console.error("❌ City Weather API Error:", error);
			throw this.handleWeatherError(error);
		}
	}
	// Transform OpenWeatherMap response to our format
	transformWeatherResponse(data) {
		return {
			id: data.id,
			cityName: data.name,
			country: data.sys.country,
			coordinates: {
				lat: data.coord.lat,
				lon: data.coord.lon,
			},
			weather: {
				main: data.weather[0].main,
				description: data.weather[0].description,
				icon: data.weather[0].icon,
				iconUrl: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
			},
			temperature: {
				current: Math.round(data.main.temp),
				feelsLike: Math.round(data.main.feels_like),
				min: Math.round(data.main.temp_min),
				max: Math.round(data.main.temp_max),
			},
			humidity: data.main.humidity,
			pressure: data.main.pressure,
			visibility: data.visibility,
			wind: {
				speed: data.wind?.speed || 0,
				direction: data.wind?.deg || 0,
				gust: data.wind?.gust || 0,
			},
			clouds: data.clouds.all,
			sunrise: new Date(data.sys.sunrise * 1000),
			sunset: new Date(data.sys.sunset * 1000),
			timestamp: new Date(data.dt * 1000),
			timezone: data.timezone,
			isStale: false,
		};
	}
	// Transform forecast response
	transformForecastResponse(data) {
		return {
			city: {
				id: data.city.id,
				name: data.city.name,
				country: data.city.country,
				coordinates: data.city.coord,
				timezone: data.city.timezone,
			},
			forecasts: data.list.map((item) => ({
				datetime: new Date(item.dt * 1000),
				temperature: {
					current: Math.round(item.main.temp),
					feelsLike: Math.round(item.main.feels_like),
					min: Math.round(item.main.temp_min),
					max: Math.round(item.main.temp_max),
				},
				weather: {
					main: item.weather[0].main,
					description: item.weather[0].description,
					icon: item.weather[0].icon,
					iconUrl: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
				},
				humidity: item.main.humidity,
				pressure: item.main.pressure,
				wind: {
					speed: item.wind?.speed || 0,
					direction: item.wind?.deg || 0,
					gust: item.wind?.gust || 0,
				},
				clouds: item.clouds.all,
				precipitationProbability: item.pop,
			})),
			isStale: false,
		};
	}
	// Cache management
	async getCachedData(key) {
		try {
			const cached = await AsyncStorage.getItem(`@weather_${key}`);
			if (!cached) return null;
			const { data, timestamp } = JSON.parse(cached);
			const isExpired = Date.now() - timestamp > this.cacheTimeout;

			if (isExpired) {
				await AsyncStorage.removeItem(`@weather_${key}`);
				return null;
			}
			return data;
		} catch (error) {
			console.error("❌ Cache read error:", error);
			return null;
		}
	}
	async setCachedData(key, data) {
		try {
			const cacheEntry = {
				data,
				timestamp: Date.now(),
			};

			await AsyncStorage.setItem(`@weather_${key}`, JSON.stringify(cacheEntry));
		} catch (error) {
			console.error("❌ Cache write error:", error);
		}
	}
	// Error handling
	handleWeatherError(error) {
		if (error.isNetworkError) {
			return {
				type: "NETWORK_ERROR",
				message:
					"Unable to connect to weather service. Please check your internet connection.",
				retryable: true,
			};
		}
		if (error.response?.status === 401) {
			return {
				type: "AUTH_ERROR",
				message:
					"Weather service authentication failed. Please contact support.",
				retryable: false,
			};
		}
		if (error.response?.status === 404) {
			return {
				type: "NOT_FOUND",
				message: "Location not found. Please try a different city name.",
				retryable: false,
			};
		}
		if (error.response?.status === 429) {
			return {
				type: "RATE_LIMIT",
				message: "Too many requests. Please wait a moment and try again.",
				retryable: true,
				retryAfter: 60000, // 1 minute
			};
		}
		return {
			type: "UNKNOWN_ERROR",
			message: "An unexpected error occurred. Please try again.",
			retryable: true,
		};
	}
	// Clear all cached data
	async clearCache() {
		try {
			const keys = await AsyncStorage.getAllKeys();
			const weatherKeys = keys.filter((key) => key.startsWith("@weather_"));
			await AsyncStorage.multiRemove(weatherKeys);
			console.log("🗑️ Weather cache cleared");
		} catch (error) {
			console.error("❌ Error clearing cache:", error);
		}
	}
}
export default new WeatherService();
