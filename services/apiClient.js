import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
// Base API client configuration
const createApiClient = (baseURL, options = {}) => {
	const client = axios.create({
		baseURL,
		timeout: 10000,
		headers: {
			"Content-Type": "application/json",
			"User-Agent": `MyApp/${Constants.manifest?.version || "1.0.0"}`,
			...options.headers,
		},
	});
	// Request interceptor for authentication and logging
	client.interceptors.request.use(
		async (config) => {
			// Add authentication token if available
			const token = await AsyncStorage.getItem("@auth_token");
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
			// Log request for debugging
			console.log(
				`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`
			);

			return config;
		},
		(error) => {
			console.error("❌ Request Error:", error);
			return Promise.reject(error);
		}
	);
	// Response interceptor for error handling and data transformation
	client.interceptors.response.use(
		(response) => {
			console.log(`✅ API Response: ${response.status} ${response.config.url}`);

			// Transform response data if needed
			return {
				...response,
				data: response.data,
				timestamp: new Date().toISOString(),
			};
		},
		async (error) => {
			const { response, request, config } = error;

			// Handle different error types
			if (response) {
				// Server responded with error status
				console.error(`❌ API Error ${response.status}:`, response.data);

				// Handle specific status codes
				switch (response.status) {
					case 401:
						// Unauthorized - clear token and redirect to login
						await AsyncStorage.removeItem("@auth_token");
						// Could trigger logout action here
						break;
					case 429:
						// Rate limited - implement backoff
						console.warn("🚦 Rate limited, implementing backoff");
						break;
					case 503:
						// Service unavailable - try cached data
						console.warn("🚨 Service unavailable, falling back to cache");
						break;
				}
			} else if (request) {
				// Network error
				console.error("🌐 Network Error:", error.message);
			} else {
				// Configuration error
				console.error("⚙️ Config Error:", error.message);
			}
			return Promise.reject({
				...error,
				isNetworkError: !response,
				isServerError: response?.status >= 500,
				isClientError: response?.status >= 400 && response?.status < 500,
			});
		}
	);
	return client;
};
export default createApiClient;
