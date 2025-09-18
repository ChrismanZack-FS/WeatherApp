
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
	Alert,
	Dimensions,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

import barcodeService from "../services/barcodeService";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const QRCodeScanner = ({
	onCodeScanned,
	onClose,
	allowDuplicates = false,
	supportedTypes = null,
	showHistory = true,
	title = "Scan QR Code",
}) => {
	const [permission, requestPermission] = useCameraPermissions();
	const [isScanning, setIsScanning] = useState(true);
	const [scanHistory, setScanHistory] = useState([]);
	const [flashOn, setFlashOn] = useState(false);
	useEffect(() => {
		requestPermission();
		loadScanHistory();
	}, []);
	const loadScanHistory = () => {
		const history = barcodeService.getScanHistory(5);
		setScanHistory(history);
	};
	const handleBarCodeScanned = ({ type, data, bounds }) => {
		if (!isScanning) return;
		try {
			setIsScanning(false);

			const processedResult = barcodeService.processScanResult(
				{ type, data, bounds },
				{
					allowDuplicates,
					hapticFeedback: true,
				}
			);
			if (processedResult) {
				// Update scan history
				loadScanHistory();

				// Show result to user
				showScanResult(processedResult);

				// Callback to parent component
				onCodeScanned?.(processedResult);
			} else {
				// Duplicate scan, resume scanning
				setTimeout(() => setIsScanning(true), 1000);
			}
		} catch (error) {
			console.error("Error handling barcode scan:", error);
			Alert.alert("Error", "Failed to process scanned code.");
			setIsScanning(true);
		}
	};
	const showScanResult = (result) => {
		const { processed } = result;
		let message = `Scanned: ${processed.type.toUpperCase()}`;

		switch (processed.type) {
			case "url":
				message = `Website: ${processed.structured.domain}`;
				break;
			case "email":
				message = `Email: ${processed.structured.email}`;
				break;
			case "phone":
				message = `Phone: ${processed.structured.phone}`;
				break;
			case "wifi":
				message = `WiFi: ${processed.structured.ssid}`;
				break;
			case "contact":
				message = `Contact: ${processed.structured.name || "Unknown"}`;
				break;
			case "location":
				message = `Location: ${processed.structured.latitude}, ${processed.structured.longitude}`;
				break;
			default:
				message = `Text: ${processed.raw.substring(0, 50)}${
					processed.raw.length > 50 ? "..." : ""
				}`;
		}
		Alert.alert("Code Scanned!", message, [
			{
				text: "Scan Again",
				onPress: () => {
					barcodeService.resetScanner();
					setIsScanning(true);
				},
			},
			{
				text: "Done",
				style: "default",
				onPress: onClose,
			},
		]);
	};
	const handleToggleFlash = () => {
		setFlashOn((current) => !current);
		Haptics.selectionAsync();
	};
	const handleViewHistory = () => {
		const history = barcodeService.getScanHistory(10);

		if (history.length === 0) {
			Alert.alert("No History", "No previously scanned codes found.");
			return;
		}
		const historyText = history
			.map(
				(item, index) =>
					`${index + 1}. ${item.processed.type.toUpperCase()}: ${
						item.processed.structured?.text ||
						item.processed.structured?.url ||
						item.processed.raw.substring(0, 30)
					}...`
			)
			.join("\n\n");
		Alert.alert("Scan History", historyText);
	};
	const handleClearHistory = () => {
		Alert.alert(
			"Clear History",
			"Are you sure you want to clear all scan history?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: () => {
						barcodeService.clearScanHistory();
						setScanHistory([]);
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
					},
				},
			]
		);
	};
	if (!permission) {
		return null;
	}
	if (!permission.granted) {
		return (
			<View style={styles.permissionContainer}>
				<Ionicons name="camera-off" size={64} color="#666" />
				<Text style={styles.permissionTitle}>Camera Access Denied</Text>
				<Text style={styles.permissionText}>
					Please enable camera access in your device settings to scan QR codes.
				</Text>
				<TouchableOpacity
					style={styles.settingsButton}
					onPress={requestPermission}
				>
					<Text style={styles.settingsButtonText}>Try Again</Text>
				</TouchableOpacity>
			</View>
		);
	}
	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="black" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.headerButton} onPress={onClose}>
					<Ionicons name="close" size={28} color="white" />
				</TouchableOpacity>

				<Text style={styles.headerTitle}>{title}</Text>

				<TouchableOpacity
					style={styles.headerButton}
					onPress={handleToggleFlash}
				>
					<Ionicons
						name={flashOn ? "flash" : "flash-off"}
						size={28}
						color="white"
					/>
				</TouchableOpacity>
			</View>
			{/* Scanner */}
			<View style={styles.scannerContainer}>
				<CameraView
					style={styles.scanner}
					onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
					barcodeScannerSettings={{
						barcodeTypes:
							supportedTypes || barcodeService.getSupportedBarcodeTypes(),
					}}
					flash={flashOn ? "on" : "off"}
				/>

				{/* Scanning Overlay */}
				<View style={styles.overlay}>
					{/* Top Overlay */}
					<View style={styles.overlayTop}>
						<Text style={styles.instructionText}>
							Position the QR code within the frame
						</Text>
					</View>

					{/* Scanner Frame */}
					<View style={styles.scannerFrame}>
						<View style={styles.scannerFrameCorners}>
							<View style={[styles.corner, styles.topLeft]} />
							<View style={[styles.corner, styles.topRight]} />
							<View style={[styles.corner, styles.bottomLeft]} />
							<View style={[styles.corner, styles.bottomRight]} />
						</View>

						{/* Scanning Animation */}
						{isScanning && <View style={styles.scanLine} />}
					</View>

					{/* Bottom Overlay */}
					<View style={styles.overlayBottom}>
						<Text style={styles.supportedTypesText}>
							Supports QR codes, barcodes, and more
						</Text>
					</View>
				</View>
			</View>
			{/* Bottom Controls */}
			<View style={styles.bottomControls}>
				{showHistory && (
					<TouchableOpacity
						style={styles.bottomButton}
						onPress={handleViewHistory}
					>
						<Ionicons name="time" size={24} color="white" />
						<Text style={styles.bottomButtonText}>History</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					style={[styles.bottomButton, styles.primaryButton]}
					onPress={() => setIsScanning(!isScanning)}
				>
					<Ionicons
						name={isScanning ? "pause" : "play"}
						size={24}
						color="white"
					/>
					<Text style={styles.bottomButtonText}>
						{isScanning ? "Pause" : "Resume"}
					</Text>
				</TouchableOpacity>

				{showHistory && (
					<TouchableOpacity
						style={styles.bottomButton}
						onPress={handleClearHistory}
					>
						<Ionicons name="trash" size={24} color="white" />
						<Text style={styles.bottomButtonText}>Clear</Text>
					</TouchableOpacity>
				)}
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
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "rgba(0,0,0,0.8)",
	},
	headerButton: {
		width: 44,
		height: 44,
		justifyContent: "center",
		alignItems: "center",
	},
	headerTitle: {
		color: "white",
		fontSize: 18,
		fontWeight: "600",
	},
	scannerContainer: {
		flex: 1,
		position: "relative",
	},
	scanner: {
		flex: 1,
	},
	overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
	},
	overlayTop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "flex-end",
		alignItems: "center",
		paddingBottom: 20,
	},
	overlayBottom: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "flex-start",
		alignItems: "center",
		paddingTop: 20,
	},
	instructionText: {
		color: "white",
		fontSize: 16,
		textAlign: "center",
		marginHorizontal: 20,
	},
	supportedTypesText: {
		color: "#ccc",
		fontSize: 14,
		textAlign: "center",
	},
	scannerFrame: {
		width: 250,
		height: 250,
		position: "relative",
	},
	scannerFrameCorners: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	corner: {
		position: "absolute",
		width: 30,
		height: 30,
		borderColor: "white",
	},
	topLeft: {
		top: 0,
		left: 0,
		borderTopWidth: 3,
		borderLeftWidth: 3,
	},
	topRight: {
		top: 0,
		right: 0,
		borderTopWidth: 3,
		borderRightWidth: 3,
	},
	bottomLeft: {
		bottom: 0,
		left: 0,
		borderBottomWidth: 3,
		borderLeftWidth: 3,
	},
	bottomRight: {
		bottom: 0,
		right: 0,
		borderBottomWidth: 3,
		borderRightWidth: 3,
	},
	scanLine: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: "#007AFF",
		// Add animation here
	},
	bottomControls: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 20,
		backgroundColor: "rgba(0,0,0,0.8)",
	},
	bottomButton: {
		alignItems: "center",
		padding: 10,
		minWidth: 80,
	},
	primaryButton: {
		backgroundColor: "#007AFF",
		borderRadius: 25,
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	bottomButtonText: {
		color: "white",
		fontSize: 12,
		marginTop: 4,
		fontWeight: "500",
	},
});
export default QRCodeScanner;
