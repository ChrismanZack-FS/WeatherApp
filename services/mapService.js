import { Platform } from "react-native";
import { config } from "../config/environment";
import createApiClient from "./apiClient";
class MapService {
	constructor() {
		if (Platform.OS === "web") {
			this.isWeb = true;
			this.client = null;
		} else {
			this.isWeb = false;
			this.client = createApiClient(config.MAPBOX_BASE_URL);
		}
	}
	// Geocoding - convert address to coordinates
	async geocode(query, options = {}) {
		if (this.isWeb) {
			console.warn("Map geocoding is not supported on web.");
			return [];
		}
		try {
			const response = await this.client.get(
				"/geocoding/v5/mapbox.places/" + encodeURIComponent(query) + ".json",
				{
					params: {
						access_token: config.MAPBOX_API_KEY,
						limit: options.limit || 5,
						types: options.types || "address,poi,place",
						country: options.country,
						proximity: options.proximity,
						bbox: options.bbox,
						language: options.language || "en",
					},
				}
			);
			return response.data.features.map((feature) => ({
				id: feature.id,
				name: feature.place_name,
				address: feature.properties.address,
				coordinates: {
					longitude: feature.center[0],
					latitude: feature.center[1],
				},
				bbox: feature.bbox,
				context: feature.context?.reduce((acc, ctx) => {
					const [type] = ctx.id.split(".");
					acc[type] = ctx.text;
					return acc;
				}, {}),
				relevance: feature.relevance,
			}));
		} catch (error) {
			console.error("❌ Geocoding Error:", error);
			throw this.handleMapError(error);
		}
	}
	// Reverse geocoding - convert coordinates to address
	async reverseGeocode(latitude, longitude, options = {}) {
		if (this.isWeb) {
			console.warn("Map reverse geocoding is not supported on web.");
			return null;
		}
		try {
			const response = await this.client.get(
				`/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
				{
					params: {
						access_token: config.MAPBOX_API_KEY,
						types: options.types || "address,poi,place",
						language: options.language || "en",
					},
				}
			);
			if (response.data.features.length === 0) {
				return null;
			}
			const feature = response.data.features[0];

			return {
				id: feature.id,
				name: feature.place_name,
				address: feature.properties.address,
				coordinates: {
					longitude: feature.center[0],
					latitude: feature.center[1],
				},
				context: feature.context?.reduce((acc, ctx) => {
					const [type] = ctx.id.split(".");
					acc[type] = ctx.text;
					return acc;
				}, {}),
			};
		} catch (error) {
			console.error("❌ Reverse Geocoding Error:", error);
			throw this.handleMapError(error);
		}
	}
	// Get directions between points
	async getDirections(coordinates, options = {}) {
		if (this.isWeb) {
			console.warn("Map directions are not supported on web.");
			return null;
		}
		try {
			const profile = options.profile || "driving";
			const coordString = coordinates
				.map((coord) => `${coord.longitude},${coord.latitude}`)
				.join(";");
			const response = await this.client.get(
				`/directions/v5/mapbox/${profile}/${coordString}`,
				{
					params: {
						access_token: config.MAPBOX_API_KEY,
						geometries: "geojson",
						steps: options.steps || false,
						overview: options.overview || "full",
						alternatives: options.alternatives || false,
						language: options.language || "en",
					},
				}
			);
			const route = response.data.routes[0];

			if (!route) {
				throw new Error("No route found");
			}
			return {
				duration: route.duration, // seconds
				distance: route.distance, // meters
				geometry: route.geometry,
				steps:
					route.legs?.[0]?.steps?.map((step) => ({
						instruction: step.maneuver.instruction,
						distance: step.distance,
						duration: step.duration,
						geometry: step.geometry,
					})) || [],
			};
		} catch (error) {
			console.error("❌ Directions Error:", error);
			throw this.handleMapError(error);
		}
	}
	// Generate static map image URL
	generateStaticMapUrl(options = {}) {
		if (this.isWeb) {
			console.warn("Static map images are not supported on web.");
			return null;
		}
		const {
			latitude,
			longitude,
			zoom = 12,
			width = 300,
			height = 200,
			markers = [],
			style = "streets-v11",
		} = options;
		let url = `${config.MAPBOX_BASE_URL}/styles/v1/mapbox/${style}/static`;
		// Add markers
		if (markers.length > 0) {
			const markerString = markers
				.map((marker) => {
					const {
						longitude: lng,
						latitude: lat,
						color = "red",
						size = "small",
					} = marker;
					return `pin-${size}-${color}(${lng},${lat})`;
				})
				.join(",");

			url += `/${markerString}`;
		}
		// Add center and zoom
		url += `/${longitude},${latitude},${zoom}`;
		// Add dimensions and access token
		url += `/${width}x${height}?access_token=${config.MAPBOX_API_KEY}`;
		return url;
	}
	// Error handling
	handleMapError(error) {
		if (error.isNetworkError) {
			return {
				type: "NETWORK_ERROR",
				message:
					"Unable to connect to map service. Please check your internet connection.",
				retryable: true,
			};
		}
		if (error.response?.status === 401) {
			return {
				type: "AUTH_ERROR",
				message: "Map service authentication failed. Please contact support.",
				retryable: false,
			};
		}
		if (error.response?.status === 422) {
			return {
				type: "INVALID_REQUEST",
				message: "Invalid location or search query.",
				retryable: false,
			};
		}
		return {
			type: "UNKNOWN_ERROR",
			message: "An unexpected error occurred with the map service.",
			retryable: true,
		};
	}
}
export default new MapService();
