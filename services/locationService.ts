import * as Location from "expo-location";
import { Platform } from "react-native";

export interface LocationCoordinates {
	latitude: number;
	longitude: number;
	altitude?: number;
	accuracy?: number;
	heading?: number;
	speed?: number;
}
export interface LocationRegion {
	latitude: number;
	longitude: number;
	latitudeDelta: number;
	longitudeDelta: number;
}
export interface GeofenceRegion {
	identifier: string;
	latitude: number;
	longitude: number;
	radius: number;
	notifyOnEntry?: boolean;
	notifyOnExit?: boolean;
}

class LocationService {
	private static instance: LocationService;
	private locationSubscription: Location.LocationSubscription | null = null;
	private geofenceRegions: GeofenceRegion[] = [];
	public static getInstance(): LocationService {
		if (!LocationService.instance) {
			LocationService.instance = new LocationService();
		}
		return LocationService.instance;
	}
	// Request location permissions with platform-specific handling
	async requestLocationPermissions(): Promise<boolean> {
		try {
			let foregroundResult = await Location.requestForegroundPermissionsAsync();
			if (!foregroundResult || typeof foregroundResult.status !== "string") {
				console.error("Location permission error: Invalid response from API");
				return false;
			}
			if (
				foregroundResult.status === "denied" ||
				foregroundResult.status === "undetermined"
			) {
				console.warn("Location permission denied by user or undetermined");
				if (foregroundResult.canAskAgain === false) {
					console.error(
						"User has permanently denied location permission. Please enable it in device settings."
					);
				}
				return false;
			}
			if (foregroundResult.status !== "granted") {
				console.warn(
					`Location permission not granted: ${foregroundResult.status}`
				);
				return false;
			}

			// Request background location if needed (iOS/Android only)
			if (Platform.OS !== "web") {
				try {
					const backgroundStatus =
						await Location.requestBackgroundPermissionsAsync();
					if (
						!backgroundStatus ||
						typeof backgroundStatus.status !== "string"
					) {
						console.error(
							"Background location permission error: Invalid response from API"
						);
					} else if (
						backgroundStatus.status === "denied" ||
						backgroundStatus.status === "undetermined"
					) {
						console.warn(
							"Background location permission denied or undetermined"
						);
						if (backgroundStatus.canAskAgain === false) {
							console.error(
								"User has permanently denied background location permission. Please enable it in device settings."
							);
						}
					} else if (backgroundStatus.status !== "granted") {
						console.warn(
							`Background location permission not granted: ${backgroundStatus.status}`
						);
					}
				} catch (bgError) {
					console.error("Background location permission error:", bgError);
				}
			}
			return true;
		} catch (error) {
			if (error instanceof Error) {
				console.error("Location permission error:", error.message);
			} else {
				console.error("Location permission error: Unknown error", error);
			}
			return false;
		}
	}
	// Get current location with error handling
	async getCurrentLocation(): Promise<LocationCoordinates | null> {
		try {
			const hasPermission = await this.requestLocationPermissions();
			if (!hasPermission) {
				throw new Error("Location permission required");
			}
			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
				timeInterval: 10000, // 10 seconds
				distanceInterval: 100, // 100 meters
			});
			return {
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				altitude: location.coords.altitude || undefined,
				accuracy: location.coords.accuracy || undefined,
				heading: location.coords.heading || undefined,
				speed: location.coords.speed || undefined,
			};
		} catch (error) {
			console.error("Failed to get current location:", error);
			if (error instanceof Error) {
				throw new Error(`Location unavailable: ${error.message}`);
			} else {
				throw new Error("Location unavailable: Unknown error");
			}
		}
	}
	// Start tracking location changes
	async startLocationTracking(
		onLocationUpdate: (location: LocationCoordinates) => void,
		options?: {
			accuracy?: Location.Accuracy;
			timeInterval?: number;
			distanceInterval?: number;
		}
	): Promise<boolean> {
		try {
			const hasPermission = await this.requestLocationPermissions();
			if (!hasPermission) return false;
			this.locationSubscription = await Location.watchPositionAsync(
				{
					accuracy: options?.accuracy || Location.Accuracy.Balanced,
					timeInterval: options?.timeInterval || 30000, // 30 seconds
					distanceInterval: options?.distanceInterval || 50, // 50 meters
				},
				(location) => {
					onLocationUpdate({
						latitude: location.coords.latitude,
						longitude: location.coords.longitude,
						altitude: location.coords.altitude || undefined,
						accuracy: location.coords.accuracy || undefined,
						heading: location.coords.heading || undefined,
						speed: location.coords.speed || undefined,
					});
				}
			);
			return true;
		} catch (error) {
			console.error("Failed to start location tracking:", error);
			return false;
		}
	}
	// Stop location tracking
	stopLocationTracking(): void {
		if (this.locationSubscription) {
			this.locationSubscription.remove();
			this.locationSubscription = null;
		}
	}
	// Reverse geocoding - convert coordinates to address
	async reverseGeocode(
		latitude: number,
		longitude: number
	): Promise<string | null> {
		try {
			const addresses = await Location.reverseGeocodeAsync({
				latitude,
				longitude,
			});
			if (addresses.length > 0) {
				const address = addresses[0];
				return [
					address.streetNumber,
					address.street,
					address.city,
					address.region,
					address.postalCode,
				]
					.filter(Boolean)
					.join(", ");
			}
			return null;
		} catch (error) {
			console.error("Reverse geocoding failed:", error);
			return null;
		}
	}
	// Forward geocoding - convert address to coordinates
	async geocodeAddress(address: string): Promise<LocationCoordinates | null> {
		try {
			const locations = await Location.geocodeAsync(address);

			if (locations.length > 0) {
				const location = locations[0];
				return {
					latitude: location.latitude,
					longitude: location.longitude,
				};
			}
			return null;
		} catch (error) {
			console.error("Geocoding failed:", error);
			return null;
		}
	}
	// Calculate distance between two coordinates
	calculateDistance(
		coord1: LocationCoordinates,
		coord2: LocationCoordinates
	): number {
		const R = 6371; // Earth's radius in kilometers
		const dLat = this.toRadians(coord2.latitude - coord1.latitude);
		const dLon = this.toRadians(coord2.longitude - coord1.longitude);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(this.toRadians(coord1.latitude)) *
				Math.cos(this.toRadians(coord2.latitude)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c; // Distance in kilometers
	}
	private toRadians(degrees: number): number {
		return degrees * (Math.PI / 180);
	}
	// Add geofence region
	addGeofenceRegion(region: GeofenceRegion): void {
		this.geofenceRegions.push(region);
	}
	// Check if location is within any geofence
	checkGeofences(location: LocationCoordinates): GeofenceRegion[] {
		return this.geofenceRegions.filter((region) => {
			const distance = this.calculateDistance(location, {
				latitude: region.latitude,
				longitude: region.longitude,
			});
			return distance * 1000 <= region.radius; // Convert km to meters
		});
	}
}
export default LocationService.getInstance();
