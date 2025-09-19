import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	StyleSheet,
	TouchableOpacity,
	View,
	Text,
} from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import locationService, {
	GeofenceRegion,
	LocationCoordinates,
} from "../services/locationService";
interface LocationMapProps {
	initialRegion?: Region;
	showUserLocation?: boolean;
	geofenceRegions?: GeofenceRegion[];
	markers?: Array<{
		id: string;
		coordinate: LocationCoordinates;
		title?: string;
		description?: string;
	}>;
	onLocationUpdate?: (location: LocationCoordinates) => void;
	onGeofenceEnter?: (region: GeofenceRegion) => void;
	onGeofenceExit?: (region: GeofenceRegion) => void;
}
function LocationMap({
	initialRegion,
	showUserLocation = true,
	geofenceRegions = [],
	markers = [],
	onLocationUpdate,
	onGeofenceEnter,
	onGeofenceExit,
}: LocationMapProps) {
	const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [region, setRegion] = useState<Region | null>(initialRegion || null);
	const mapRef = useRef<MapView>(null);
	const activeGeofences = useRef<Set<string>>(new Set());
	useEffect(() => {
		let mounted = true;
		const initializeLocation = async () => {
			try {
				setLoading(true);
				setError(null);
				const currentLocation = await locationService.getCurrentLocation();

				if (!mounted) return;
				if (currentLocation) {
					setUserLocation(currentLocation);
					onLocationUpdate?.(currentLocation);
					if (!region) {
						setRegion({
							latitude: currentLocation.latitude,
							longitude: currentLocation.longitude,
							latitudeDelta: 0.01,
							longitudeDelta: 0.01,
						});
					}
					// Check geofences
					checkGeofences(currentLocation);
				}
			} catch (err) {
				if (!mounted) return;
				const errorMessage =
					err instanceof Error ? err.message : "Location unavailable";
				setError(errorMessage);
				Alert.alert("Location Error", errorMessage);
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};
		initializeLocation();
		return () => {
			mounted = false;
		};
	}, []);
	useEffect(() => {
		if (!showUserLocation) return;
		const startTracking = async () => {
			const success = await locationService.startLocationTracking(
				(location) => {
					setUserLocation(location);
					onLocationUpdate?.(location);
					checkGeofences(location);
				},
				{
					timeInterval: 10000, // 10 seconds
					distanceInterval: 50, // 50 meters
				}
			);
			if (!success && !error) {
				setError("Failed to start location tracking");
			}
		};
		startTracking();
		return () => {
			locationService.stopLocationTracking();
		};
	}, [showUserLocation]);
	const checkGeofences = (location: LocationCoordinates) => {
		const enteredRegions = locationService.checkGeofences(location);
		const enteredIds = new Set(enteredRegions.map((r) => r.identifier));
		// Check for entries
		enteredRegions.forEach((region) => {
			if (!activeGeofences.current.has(region.identifier)) {
				activeGeofences.current.add(region.identifier);
				onGeofenceEnter?.(region);
			}
		});
		// Check for exits
		activeGeofences.current.forEach((regionId) => {
			if (!enteredIds.has(regionId)) {
				activeGeofences.current.delete(regionId);
				const region = geofenceRegions.find((r) => r.identifier === regionId);
				if (region) {
					onGeofenceExit?.(region);
				}
			}
		});
	};
	const centerOnUser = async () => {
		if (!userLocation && showUserLocation) {
			try {
				const location = await locationService.getCurrentLocation();
				if (location) {
					setUserLocation(location);
					animateToLocation(location);
				}
			} catch (err) {
				Alert.alert("Location Error", "Unable to get current location");
			}
		} else if (userLocation) {
			animateToLocation(userLocation);
		}
	};
	const animateToLocation = (location: LocationCoordinates) => {
		if (mapRef.current) {
			mapRef.current.animateToRegion({
				latitude: location.latitude,
				longitude: location.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			});
		}
	};
	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}
	if (error) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="location-outline" size={48} color="#FF3B30" />
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	}
	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				style={styles.map}
				initialRegion={region || undefined}
				showsUserLocation={showUserLocation && Platform.OS !== "web"}
				showsMyLocationButton={false}
				showsCompass={true}
				showsScale={true}
			>
				{/* Custom user location marker for web compatibility */}
				{userLocation && Platform.OS === "web" && (
					<Marker
						coordinate={userLocation}
						title="Your Location"
						pinColor="blue"
					/>
				)}
				{/* Custom markers */}
				{markers.map((marker) => (
					<Marker
						key={marker.id}
						coordinate={marker.coordinate}
						title={marker.title}
						description={marker.description}
					/>
				))}
				{/* Geofence regions */}
				{geofenceRegions.map((region) => (
					<Circle
						key={region.identifier}
						center={{
							latitude: region.latitude,
							longitude: region.longitude,
						}}
						radius={region.radius}
						strokeColor="rgba(0, 122, 255, 0.5)"
						fillColor="rgba(0, 122, 255, 0.1)"
						strokeWidth={2}
					/>
				))}
			</MapView>
			{/* Center on user button */}
			{showUserLocation && (
				<TouchableOpacity
					style={styles.centerButton}
					onPress={centerOnUser}
					activeOpacity={0.7}
				>
					<Ionicons name="locate" size={24} color="white" />
				</TouchableOpacity>
			)}
		</View>
	);
}

export default LocationMap;
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	map: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
		padding: 20,
	},
	errorText: {
		fontSize: 16,
		color: "#FF3B30",
		textAlign: "center",
		marginTop: 10,
	},
	centerButton: {
		position: "absolute",
		bottom: 20,
		right: 20,
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "#007AFF",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
});
