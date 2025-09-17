import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import motionService, { AccelerometerData } from "../services/motionService";
interface MotionAwareViewProps {
	children: React.ReactNode;
	enableTiltResponse?: boolean;
	enableShakeDetection?: boolean;
	onShake?: () => void;
	onTilt?: (orientation: { pitch: number; roll: number }) => void;
	sensitivity?: number;
}
export const MotionAwareView: React.FC<MotionAwareViewProps> = ({
	children,
	enableTiltResponse = true,
	enableShakeDetection = false,
	onShake,
	onTilt,
	sensitivity = 1,
}) => {
	const [motionSupported, setMotionSupported] = useState(false);
	const [orientation, setOrientation] = useState({ pitch: 0, roll: 0 });

	const translateX = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(0)).current;
	const rotateZ = useRef(new Animated.Value(0)).current;

	const shakeTimestamp = useRef(0);
	const { width, height } = Dimensions.get("window");
	const maxTranslate = Math.min(width, height) * 0.05; // 5% of screen size
	useEffect(() => {
		let mounted = true;
		const initializeMotion = async () => {
			const availability = await motionService.checkAvailability();

			if (!mounted) return;

			if (!availability.accelerometer) {
				console.warn("Motion sensors not available on this device");
				return;
			}
			setMotionSupported(true);
			// Start accelerometer for both tilt and shake detection
			const success = await motionService.startAccelerometer(
				(data: AccelerometerData) => {
					if (!mounted) return;
					const newOrientation = motionService.calculateOrientation(data);
					setOrientation(newOrientation);
					onTilt?.(newOrientation);
					if (enableTiltResponse) {
						updateTiltAnimation(newOrientation);
					}
					if (enableShakeDetection) {
						checkForShake(data);
					}
				},
				100 // Update every 100ms for smooth animation
			);
			if (!success) {
				console.warn("Failed to start motion tracking");
			}
		};
		initializeMotion();
		return () => {
			mounted = false;
			motionService.stopAllSensors();
		};
	}, [enableTiltResponse, enableShakeDetection]);
	const updateTiltAnimation = (orientation: {
		pitch: number;
		roll: number;
	}) => {
		// Convert orientation to translation values
		const translateXValue =
			(orientation.roll / 90) * maxTranslate * sensitivity;
		const translateYValue =
			(orientation.pitch / 90) * maxTranslate * sensitivity;
		const rotateValue = orientation.roll * sensitivity;
		// Animate to new position
		Animated.parallel([
			Animated.spring(translateX, {
				toValue: Math.max(
					-maxTranslate,
					Math.min(maxTranslate, translateXValue)
				),
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}),
			Animated.spring(translateY, {
				toValue: Math.max(
					-maxTranslate,
					Math.min(maxTranslate, translateYValue)
				),
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}),
			Animated.spring(rotateZ, {
				toValue: Math.max(-10, Math.min(10, rotateValue)), // Limit rotation
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}),
		]).start();
	};
	const checkForShake = (data: AccelerometerData) => {
		const { x, y, z } = data;
		const acceleration = Math.sqrt(x * x + y * y + z * z);

		if (acceleration > 15) {
			// Shake threshold
			const now = Date.now();
			if (now - shakeTimestamp.current > 1000) {
				// Prevent rapid fire
				shakeTimestamp.current = now;
				onShake?.();

				// Shake animation
				Animated.sequence([
					Animated.timing(translateX, {
						toValue: 10,
						duration: 50,
						useNativeDriver: true,
					}),
					Animated.timing(translateX, {
						toValue: -10,
						duration: 50,
						useNativeDriver: true,
					}),
					Animated.timing(translateX, {
						toValue: 5,
						duration: 50,
						useNativeDriver: true,
					}),
					Animated.timing(translateX, {
						toValue: 0,
						duration: 50,
						useNativeDriver: true,
					}),
				]).start();
			}
		}
	};
	if (!motionSupported && Platform.OS !== "web") {
		return <View style={styles.container}>{children}</View>;
	}
	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [
						{ translateX },
						{ translateY },
						{
							rotateZ: rotateZ.interpolate({
								inputRange: [-10, 10],
								outputRange: ["-10deg", "10deg"],
							}),
						},
					],
				},
			]}
		>
			{children}

			{/* Debug info - remove in production */}
			{__DEV__ && motionSupported && (
				<View style={styles.debugInfo}>
					<Text style={styles.debugText}>
						Pitch: {orientation.pitch.toFixed(1)}°
					</Text>
					<Text style={styles.debugText}>
						Roll: {orientation.roll.toFixed(1)}°
					</Text>
				</View>
			)}
		</Animated.View>
	);
};
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	debugInfo: {
		position: "absolute",
		top: 50,
		right: 10,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		padding: 8,
		borderRadius: 4,
	},
	debugText: {
		color: "white",
		fontSize: 12,
		fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
	},
});
