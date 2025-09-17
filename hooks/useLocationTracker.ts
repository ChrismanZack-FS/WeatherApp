import { useState } from "react";
import locationService, {
	LocationCoordinates,
} from "../services/locationService";
interface LocationPoint extends LocationCoordinates {
	timestamp: number;
}
export const useLocationTracker = () => {
	const [isTracking, setIsTracking] = useState(false);
	const [currentLocation, setCurrentLocation] =
		useState<LocationCoordinates | null>(null);
	const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
	const [totalDistance, setTotalDistance] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const startTracking = async () => {
		try {
			setError(null);

			const success = await locationService.startLocationTracking(
				(location) => {
					const newPoint: LocationPoint = {
						...location,
						timestamp: Date.now(),
					};
					setCurrentLocation(location);
					setLocationHistory((prev) => {
						const updated = [...prev, newPoint];

						// Calculate distance if we have a previous point
						if (prev.length > 0) {
							const lastPoint = prev[prev.length - 1];
							const distance = locationService.calculateDistance(
								lastPoint,
								location
							);
							setTotalDistance((prevDistance) => prevDistance + distance);
						}

						return updated;
					});
				},
				{
					timeInterval: 5000, // 5 seconds
					distanceInterval: 10, // 10 meters
				}
			);
			if (success) {
				setIsTracking(true);
			} else {
				setError("Failed to start location tracking");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		}
	};
	const stopTracking = () => {
		locationService.stopLocationTracking();
		setIsTracking(false);
	};
	const clearHistory = () => {
		setLocationHistory([]);
		setTotalDistance(0);
	};
	return {
		isTracking,
		currentLocation,
		locationHistory,
		totalDistance,
		error,
		startTracking,
		stopTracking,
		clearHistory,
	};
};
