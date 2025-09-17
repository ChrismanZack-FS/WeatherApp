import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	Dimensions,
	SafeAreaView,
	StatusBar,
} from "react-native";
import {
	CameraView,
	CameraType,
	useCameraPermissions,
	FlashMode,
	VideoQuality,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import cameraService from "../services/cameraService";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CameraScreen = ({
	onPhotoTaken,
	onVideoRecorded,
	onClose,
	mode = "photo", // 'photo' or 'video'
	showGalleryButton = true,
	showFlashButton = true,
}) => {
	const [permission, requestPermission] = useCameraPermissions();
	const [hasPermission, setHasPermission] = useState(null);
	const [facing, setFacing] = useState("back");
	const [flashMode, setFlashMode] = useState("off");
	const [isRecording, setIsRecording] = useState(false);
	const [isTakingPhoto, setIsTakingPhoto] = useState(false);
	const [cameraReady, setCameraReady] = useState(false);

	const cameraRef = useRef(null);
	useEffect(() => {
		requestPermissions();

		return () => {
			// Cleanup if recording
			if (isRecording) {
				cameraService.stopVideoRecording();
			}
		};
	}, []);
	const requestPermissions = async () => {
		try {
			const permissions = await cameraService.requestCameraPermissions();
			setHasPermission(permissions.canUseCamera);

			if (!permissions.canUseCamera) {
				Alert.alert(
					"Camera Permission Required",
					"This app needs camera access to take photos and videos.",
					[
						{ text: "Cancel", style: "cancel" },
						{
							text: "Settings",
							onPress: () => {
								/* Open settings */
							},
						},
					]
				);
			}
		} catch (error) {
			console.error("Error requesting permissions:", error);
			setHasPermission(false);
		}
	};
	const handleCameraReady = () => {
		setCameraReady(true);
		cameraService.setCameraRef(cameraRef.current);
	};
	const handleTakePhoto = async () => {
		if (!cameraReady || isTakingPhoto) return;
		try {
			setIsTakingPhoto(true);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			const photo = await cameraService.takePhoto({
				quality: 0.8,
				skipProcessing: false,
				resize: { width: 1080, height: 1080 }, // Square photos
			});
			onPhotoTaken?.(photo);
		} catch (error) {
			console.error("Error taking photo:", error);
			Alert.alert("Error", "Failed to take photo. Please try again.");
		} finally {
			setIsTakingPhoto(false);
		}
	};
	const handleStartVideoRecording = async () => {
		if (!cameraReady || isRecording) return;
		try {
			setIsRecording(true);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
			const video = await cameraService.startVideoRecording({
				quality: VideoQuality["720p"],
				maxDuration: 60, // 1 minute max
			});
			setIsRecording(false);
			onVideoRecorded?.(video);
		} catch (error) {
			console.error("Error recording video:", error);
			setIsRecording(false);
			Alert.alert("Error", "Failed to record video. Please try again.");
		}
	};
	const handleStopVideoRecording = async () => {
		if (!isRecording) return;
		try {
			await cameraService.stopVideoRecording();
			setIsRecording(false);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch (error) {
			console.error("Error stopping video recording:", error);
			setIsRecording(false);
			const [permission, requestPermission] = useCameraPermissions();
		}
	};
	const handleFlipCamera = () => {
		setFacing((current) => (current === "back" ? "front" : "back"));
		Haptics.selectionAsync();
	};
	const handleToggleFlash = () => {
		setFlashMode((current) => {
			const modes = ["off", "on", "auto"];
			const currentIndex = modes.indexOf(current);
			const nextIndex = (currentIndex + 1) % modes.length;
			return modes[nextIndex];
		});
		Haptics.selectionAsync();
	};
	const handleOpenGallery = async () => {
		try {
			const result = await cameraService.pickImageFromLibrary({
				mediaTypes: mode === "video" ? "Videos" : "Images",
				allowsEditing: true,
				quality: 0.8,
			});
			if (result && !result.canceled && result.assets?.length > 0) {
				const asset = result.assets[0];
				if (mode === "video") {
					onVideoRecorded?.(asset);
				} else {
					onPhotoTaken?.(asset);
				}
			}
		} catch (error) {
			console.error("Error opening gallery:", error);
			Alert.alert("Error", "Failed to open gallery. Please try again.");
		}
	};
	const getFlashIcon = () => {
		switch (flashMode) {
			case "on":
				return "flash";
			case "auto":
				return "flash-outline";
			default:
				return "flash-off";
		}
	};
	if (hasPermission === null) {
		return (
			<View style={styles.permissionContainer}>
				<Text style={styles.permissionText}>
					Requesting camera permission...
				</Text>
			</View>
		);
	}
	if (hasPermission === false) {
		return (
			<View style={styles.permissionContainer}>
				<Ionicons name="camera-off" size={64} color="#666" />
				<Text style={styles.permissionTitle}>Camera Access Denied</Text>
				<Text style={styles.permissionText}>
					Please enable camera access in your device settings to use this
					feature.
				</Text>
				<TouchableOpacity
					style={styles.settingsButton}
					onPress={requestPermissions}
				>
					<Text style={styles.settingsButtonText}>Try Again</Text>
				</TouchableOpacity>
			</View>
		);
	}
	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="black" />

			{/* Camera Preview */}
			<View style={styles.cameraContainer}>
				<CameraView
					ref={cameraRef}
					style={styles.camera}
					facing={facing}
					flash={flashMode}
					onCameraReady={handleCameraReady}
					ratio="16:9"
				>
					{/* Top Controls */}
					<View style={styles.topControls}>
						<TouchableOpacity style={styles.topButton} onPress={onClose}>
							<Ionicons name="close" size={28} color="white" />
						</TouchableOpacity>

						{showFlashButton && (
							<TouchableOpacity
								style={styles.topButton}
								onPress={handleToggleFlash}
							>
								<Ionicons name={getFlashIcon()} size={28} color="white" />
							</TouchableOpacity>
						)}
					</View>
					{/* Recording Indicator */}
					{isRecording && (
						<View style={styles.recordingIndicator}>
							<View style={styles.recordingDot} />
							<Text style={styles.recordingText}>REC</Text>
						</View>
					)}
					{/* Bottom Controls */}
					<View style={styles.bottomControls}>
						{/* Gallery Button */}
						{showGalleryButton && (
							<TouchableOpacity
								style={styles.galleryButton}
								onPress={handleOpenGallery}
							>
								<Ionicons name="images" size={28} color="white" />
							</TouchableOpacity>
						)}
						{/* Capture Button */}
						<View style={styles.captureButtonContainer}>
							{mode === "photo" ? (
								<TouchableOpacity
									style={[
										styles.captureButton,
										isTakingPhoto && styles.captureButtonPressed,
									]}
									onPress={handleTakePhoto}
									disabled={!cameraReady || isTakingPhoto}
								>
									<View style={styles.captureButtonInner} />
								</TouchableOpacity>
							) : (
								<TouchableOpacity
									style={[
										styles.captureButton,
										isRecording && styles.recordingButton,
									]}
									onPress={
										isRecording
											? handleStopVideoRecording
											: handleStartVideoRecording
									}
									disabled={!cameraReady}
								>
									<View
										style={[
											styles.captureButtonInner,
											isRecording && styles.recordingButtonInner,
										]}
									/>
								</TouchableOpacity>
							)}
						</View>
						{/* Flip Camera Button */}
						<TouchableOpacity
							style={styles.flipButton}
							onPress={handleFlipCamera}
						>
							<Ionicons name="camera-reverse" size={28} color="white" />
						</TouchableOpacity>
					</View>
				</CameraView>
			</View>
			{/* Mode Indicator */}
			<View style={styles.modeIndicator}>
				<Text style={styles.modeText}>
					{mode === "photo" ? "PHOTO" : "VIDEO"}
				</Text>
			</View>
		</SafeAreaView>
	);
};
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
	},
	permissionContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "black",
		padding: 20,
	},
	permissionTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "white",
		marginTop: 16,
		marginBottom: 8,
	},
	permissionText: {
		fontSize: 16,
		color: "#ccc",
		textAlign: "center",
		lineHeight: 24,
	},
	settingsButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginTop: 20,
	},
	settingsButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	cameraContainer: {
		flex: 1,
	},
	camera: {
		flex: 1,
	},
	topControls: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	topButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	recordingIndicator: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "center",
		backgroundColor: "rgba(255,0,0,0.8)",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginTop: 20,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "white",
		marginRight: 6,
	},
	recordingText: {
		color: "white",
		fontSize: 12,
		fontWeight: "600",
	},
	bottomControls: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 30,
		paddingBottom: 40,
		marginTop: "auto",
	},
	galleryButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(255,255,255,0.2)",
		justifyContent: "center",
		alignItems: "center",
	},
	captureButtonContainer: {
		alignItems: "center",
	},
	captureButton: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "white",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 4,
		borderColor: "rgba(255,255,255,0.5)",
	},
	captureButtonPressed: {
		transform: [{ scale: 0.95 }],
	},
	recordingButton: {
		backgroundColor: "#FF3B30",
	},
	captureButtonInner: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "white",
	},
	recordingButtonInner: {
		borderRadius: 8,
		backgroundColor: "white",
	},
	flipButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(255,255,255,0.2)",
		justifyContent: "center",
		alignItems: "center",
	},
	modeIndicator: {
		alignItems: "center",
		paddingVertical: 16,
		backgroundColor: "black",
	},
	modeText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: 2,
	},
});
export default CameraScreen;
