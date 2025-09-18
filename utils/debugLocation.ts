export interface LocationDebugInfo {
	timestamp: number;
	source: string;
	coordinates: {
		latitude: number;
		longitude: number;
		accuracy?: number;
	};
	address?: string;
	weatherData?: any;
	errors?: string[];
}
class LocationDebugger {
	private static instance: LocationDebugger;
	private debugLog: LocationDebugInfo[] = [];
	private isEnabled: boolean = __DEV__;
	public static getInstance(): LocationDebugger {
		if (!LocationDebugger.instance) {
			LocationDebugger.instance = new LocationDebugger();
		}
		return LocationDebugger.instance;
	}
	// Log location-related events with full context
	logLocationEvent(
		source: string,
		coordinates: { latitude: number; longitude: number; accuracy?: number },
		additionalData?: any
	): void {
		if (!this.isEnabled) return;
		const entry: LocationDebugInfo = {
			timestamp: Date.now(),
			source,
			coordinates,
			...additionalData,
		};
		this.debugLog.push(entry);

		// Keep only last 50 entries to prevent memory issues
		if (this.debugLog.length > 50) {
			this.debugLog = this.debugLog.slice(-50);
		}
		console.log(`[LocationDebug] ${source}:`, entry);
	}
	// Get formatted debug report
	getDebugReport(): string {
		const report = this.debugLog
			.map((entry, index) => {
				const date = new Date(entry.timestamp).toISOString();
				const coords = `${entry.coordinates.latitude.toFixed(
					6
				)}, ${entry.coordinates.longitude.toFixed(6)}`;
				const accuracy = entry.coordinates.accuracy
					? ` (±${entry.coordinates.accuracy}m)`
					: "";

				let report = `${index + 1}. [${date}] ${
					entry.source
				}: ${coords}${accuracy}`;

				if (entry.address) {
					report += `\n   Address: ${entry.address}`;
				}

				if (entry.weatherData) {
					report += `\n   Weather: ${
						entry.weatherData.location?.name || "Unknown"
					} - ${entry.weatherData.current?.description || "No description"}`;
				}

				if (entry.errors && entry.errors.length > 0) {
					report += `\n   Errors: ${entry.errors.join(", ")}`;
				}

				return report;
			})
			.join("\n\n");
		return report;
	}
	// Validate coordinates
	validateCoordinates(
		lat: number,
		lon: number
	): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (typeof lat !== "number" || typeof lon !== "number") {
			errors.push("Coordinates must be numbers");
		}

		if (lat < -90 || lat > 90) {
			errors.push(`Invalid latitude: ${lat} (must be between -90 and 90)`);
		}

		if (lon < -180 || lon > 180) {
			errors.push(`Invalid longitude: ${lon} (must be between -180 and 180)`);
		}

		if (lat === 0 && lon === 0) {
			errors.push("Null Island coordinates (0,0) - likely default/error value");
		}

		// Check for suspiciously rounded coordinates (might indicate low accuracy)
		if (lat % 1 === 0 && lon % 1 === 0) {
			errors.push(
				"Coordinates appear to be rounded to whole numbers - check GPS accuracy"
			);
		}
		return {
			valid: errors.length === 0,
			errors,
		};
	}
	// Check if coordinates have changed significantly
	hasLocationChanged(
		oldCoords: { latitude: number; longitude: number },
		newCoords: { latitude: number; longitude: number },
		thresholdMeters: number = 100
	): boolean {
		const distance = this.calculateDistance(oldCoords, newCoords);
		return distance > thresholdMeters;
	}
	// Calculate distance between coordinates
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
	// Clear debug log
	clearLog(): void {
		this.debugLog = [];
	}
	// Export debug log as JSON
	exportLog(): string {
		return JSON.stringify(this.debugLog, null, 2);
	}
}
export default LocationDebugger.getInstance();
