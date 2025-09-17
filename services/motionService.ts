import { Accelerometer, Gyroscope, Magnetometer } from "expo-sensors";
import { Platform } from "react-native";
export interface AccelerometerData {
	x: number;
	y: number;
	z: number;
	timestamp: number;
}
export interface GyroscopeData {
	x: number;
	y: number;
	z: number;
	timestamp: number;
}
export interface MagnetometerData {
	x: number;
	y: number;
	z: number;
	timestamp: number;
}
export interface MotionEvent {
	type: "shake" | "tilt" | "rotation" | "significant_motion";
	data: any;
	timestamp: number;
}
class MotionService {
	private static instance: MotionService;
	private accelerometerSubscription: any = null;
	private gyroscopeSubscription: any = null;
	private magnetometerSubscription: any = null;

	private accelerometerHistory: AccelerometerData[] = [];
	private shakeThreshold = 15; // Shake detection threshold
	private shakeTimestamp = 0;

	public static getInstance(): MotionService {
		if (!MotionService.instance) {
			MotionService.instance = new MotionService();
		}
		return MotionService.instance;
	}
	// Check if motion sensors are available
	async checkAvailability(): Promise<{
		accelerometer: boolean;
		gyroscope: boolean;
		magnetometer: boolean;
	}> {
		const availability = {
			accelerometer: false,
			gyroscope: false,
			magnetometer: false,
		};
		try {
			if (Platform.OS !== "web") {
				availability.accelerometer = await Accelerometer.isAvailableAsync();
				availability.gyroscope = await Gyroscope.isAvailableAsync();
				availability.magnetometer = await Magnetometer.isAvailableAsync();
			}
		} catch (error) {
			console.warn("Motion sensor availability check failed:", error);
		}
		return availability;
	}
	// Start accelerometer monitoring
	async startAccelerometer(
		onData: (data: AccelerometerData) => void,
		updateInterval: number = 1000
	): Promise<boolean> {
		try {
			if (Platform.OS === "web") {
				console.warn("Accelerometer not available on web platform");
				return false;
			}
			const isAvailable = await Accelerometer.isAvailableAsync();
			if (!isAvailable) {
				console.warn("Accelerometer not available on this device");
				return false;
			}
			Accelerometer.setUpdateInterval(updateInterval);

			this.accelerometerSubscription = Accelerometer.addListener((data) => {
				const motionData: AccelerometerData = {
					x: data.x,
					y: data.y,
					z: data.z,
					timestamp: Date.now(),
				};
				// Add to history for shake detection
				this.accelerometerHistory.push(motionData);
				if (this.accelerometerHistory.length > 10) {
					this.accelerometerHistory.shift();
				}
				// Check for shake gesture
				this.detectShake(motionData);

				onData(motionData);
			});
			return true;
		} catch (error) {
			console.error("Failed to start accelerometer:", error);
			return false;
		}
	}
	// Start gyroscope monitoring
	async startGyroscope(
		onData: (data: GyroscopeData) => void,
		updateInterval: number = 1000
	): Promise<boolean> {
		try {
			if (Platform.OS === "web") {
				console.warn("Gyroscope not available on web platform");
				return false;
			}
			const isAvailable = await Gyroscope.isAvailableAsync();
			if (!isAvailable) {
				console.warn("Gyroscope not available on this device");
				return false;
			}
			Gyroscope.setUpdateInterval(updateInterval);

			this.gyroscopeSubscription = Gyroscope.addListener((data) => {
				const motionData: GyroscopeData = {
					x: data.x,
					y: data.y,
					z: data.z,
					timestamp: Date.now(),
				};

				onData(motionData);
			});
			return true;
		} catch (error) {
			console.error("Failed to start gyroscope:", error);
			return false;
		}
	}
	// Start magnetometer monitoring
	async startMagnetometer(
		onData: (data: MagnetometerData) => void,
		updateInterval: number = 1000
	): Promise<boolean> {
		try {
			if (Platform.OS === "web") {
				console.warn("Magnetometer not available on web platform");
				return false;
			}
			const isAvailable = await Magnetometer.isAvailableAsync();
			if (!isAvailable) {
				console.warn("Magnetometer not available on this device");
				return false;
			}
			Magnetometer.setUpdateInterval(updateInterval);

			this.magnetometerSubscription = Magnetometer.addListener((data) => {
				const motionData: MagnetometerData = {
					x: data.x,
					y: data.y,
					z: data.z,
					timestamp: Date.now(),
				};

				onData(motionData);
			});
			return true;
		} catch (error) {
			console.error("Failed to start magnetometer:", error);
			return false;
		}
	}
	// Detect shake gesture from accelerometer data
	private detectShake(data: AccelerometerData): void {
		const { x, y, z } = data;
		const acceleration = Math.sqrt(x * x + y * y + z * z);

		if (acceleration > this.shakeThreshold) {
			const now = Date.now();
			if (now - this.shakeTimestamp > 1000) {
				// Prevent rapid fire
				this.shakeTimestamp = now;
				// Emit shake event (you would typically use EventEmitter here)
				console.log("Shake detected!", { acceleration, timestamp: now });
			}
		}
	}
	// Calculate device orientation from accelerometer
	calculateOrientation(data: AccelerometerData): {
		pitch: number;
		roll: number;
	} {
		const { x, y, z } = data;

		// Calculate pitch and roll in degrees
		const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
		const roll = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);

		return { pitch, roll };
	}
	// Calculate compass heading from magnetometer
	calculateHeading(magnetometerData: MagnetometerData): number {
		const { x, y } = magnetometerData;
		let heading = Math.atan2(y, x) * (180 / Math.PI);

		// Normalize to 0-360 degrees
		if (heading < 0) {
			heading += 360;
		}

		return heading;
	}
	// Stop all motion sensors
	stopAllSensors(): void {
		if (this.accelerometerSubscription) {
			this.accelerometerSubscription.remove();
			this.accelerometerSubscription = null;
		}

		if (this.gyroscopeSubscription) {
			this.gyroscopeSubscription.remove();
			this.gyroscopeSubscription = null;
		}

		if (this.magnetometerSubscription) {
			this.magnetometerSubscription.remove();
			this.magnetometerSubscription = null;
		}
	}
}
export default MotionService.getInstance();
