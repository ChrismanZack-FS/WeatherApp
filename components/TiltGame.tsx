import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import motionService, { AccelerometerData } from "../services/motionService";
interface Position {
	x: number;
	y: number;
}
export const TiltGame: React.FC = () => {
	const [score, setScore] = useState(0);
	const [gameActive, setGameActive] = useState(false);
	const [ballPosition, setBallPosition] = useState<Position>({ x: 0, y: 0 });

	const ballTranslateX = useRef(new Animated.Value(0)).current;
	const ballTranslateY = useRef(new Animated.Value(0)).current;

	const { width, height } = Dimensions.get("window");
	const ballSize = 30;
	const maxX = (width - ballSize) / 2;
	const maxY = (height - ballSize) / 2;
	useEffect(() => {
		if (!gameActive) return;
		let mounted = true;
		const startGame = async () => {
			const success = await motionService.startAccelerometer(
				(data: AccelerometerData) => {
					if (!mounted || !gameActive) return;
					// Convert accelerometer data to ball movement
					const sensitivity = 2;
					const newX = Math.max(
						-maxX,
						Math.min(maxX, data.x * sensitivity * 100)
					);
					const newY = Math.max(
						-maxY,
						Math.min(maxY, -data.y * sensitivity * 100)
					);
					setBallPosition({ x: newX, y: newY });
					// Animate ball movement
					Animated.parallel([
						Animated.spring(ballTranslateX, {
							toValue: newX,
							useNativeDriver: true,
							tension: 100,
							friction: 8,
						}),
						Animated.spring(ballTranslateY, {
							toValue: newY,
							useNativeDriver: true,
							tension: 100,
							friction: 8,
						}),
					]).start();
				},
				50 // High frequency for smooth gameplay
			);
			if (!success) {
				setGameActive(false);
				alert("Motion sensors not available");
			}
		};
		startGame();
		return () => {
			mounted = false;
			motionService.stopAllSensors();
		};
	}, [gameActive]);
	const startNewGame = () => {
		setScore(0);
		setBallPosition({ x: 0, y: 0 });
		ballTranslateX.setValue(0);
		ballTranslateY.setValue(0);
		setGameActive(true);
	};
	const stopGame = () => {
		setGameActive(false);
		motionService.stopAllSensors();
	};
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Tilt Ball Game</Text>
				<Text style={styles.score}>Score: {score}</Text>
			</View>
			<View style={styles.gameArea}>
				<Animated.View
					style={[
						styles.ball,
						{
							transform: [
								{ translateX: ballTranslateX },
								{ translateY: ballTranslateY },
							],
						},
					]}
				/>

				{/* Game instructions */}
				{!gameActive && (
					<View style={styles.instructions}>
						<Text style={styles.instructionText}>
							Tilt your device to move the ball
						</Text>
					</View>
				)}
			</View>
			<View style={styles.controls}>
				{!gameActive ? (
					<TouchableOpacity style={styles.button} onPress={startNewGame}>
						<Text style={styles.buttonText}>Start Game</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity style={styles.button} onPress={stopGame}>
						<Text style={styles.buttonText}>Stop Game</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f0f0f0",
	},
	header: {
		padding: 20,
		alignItems: "center",
		backgroundColor: "white",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
	},
	score: {
		fontSize: 18,
		color: "#666",
		marginTop: 5,
	},
	gameArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	ball: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "#FF6B6B",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	instructions: {
		position: "absolute",
		bottom: 50,
		left: 20,
		right: 20,
		padding: 20,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
		borderRadius: 10,
		alignItems: "center",
	},
	instructionText: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
	},
	controls: {
		padding: 20,
	},
	button: {
		backgroundColor: "#007AFF",
		padding: 15,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: {
		color: "white",
		fontSize: 18,
		fontWeight: "bold",
	},
});
