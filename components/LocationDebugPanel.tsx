import React, { useEffect, useState } from "react";
import {
	Alert,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import debugLocationService from "../services/debugLocationService";
import DebugWeatherService from "../services/debugWeatherService";
import locationDebugger from "../utils/debugLocation";
interface LocationDebugPanelProps {
	visible: boolean;
	onClose: () => void;
	weatherApiKey: string;
}
export const LocationDebugPanel: React.FC<LocationDebugPanelProps> = ({
	visible,
	onClose,
	weatherApiKey,
}) => {
	const [debugReport, setDebugReport] = useState("");
	const [testLatitude, setTestLatitude] = useState("");
	const [testLongitude, setTestLongitude] = useState("");
	const [loading, setLoading] = useState(false);
	const weatherService = new DebugWeatherService(weatherApiKey);
	useEffect(() => {
		if (visible) {
			updateDebugReport();
		}
	}, [visible]);
	const updateDebugReport = () => {
		const report = debugLocationService.getLocationDebugReport();
		setDebugReport(report);
	};
	const testCurrentLocation = async () => {
		setLoading(true);
		try {
			const location = await debugLocationService.getCurrentLocationWithDebug();
			await weatherService.getWeatherWithDebug(location);
			updateDebugReport();
			Alert.alert(
				"Success",
				"Location and weather data retrieved successfully"
			);
		} catch (error) {
			let errorMessage = "An error occurred";
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (typeof error === "string") {
				errorMessage = error;
			}
			Alert.alert("Error", errorMessage);
		} finally {
			setLoading(false);
		}
	};
	const testManualLocation = async () => {
		const lat = parseFloat(testLatitude);
		const lon = parseFloat(testLongitude);
		if (isNaN(lat) || isNaN(lon)) {
			Alert.alert("Error", "Please enter valid coordinates");
			return;
		}
		setLoading(true);
		try {
			const location = debugLocationService.setManualLocation(
				lat,
				lon,
				"Test Location"
			);
			await weatherService.getWeatherWithDebug(location);
			updateDebugReport();
			Alert.alert("Success", "Manual location test completed");
		} catch (error) {
			let errorMessage = "An error occurred";
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (typeof error === "string") {
				errorMessage = error;
			}
			Alert.alert("Error", errorMessage);
		} finally {
			setLoading(false);
		}
	};
	const clearDebugLog = () => {
		locationDebugger.clearLog();
		setDebugReport("");
		Alert.alert("Success", "Debug log cleared");
	};
	const exportDebugLog = () => {
		const logData = locationDebugger.exportLog();
		console.log("Debug Log Export:", logData);
		Alert.alert("Exported", "Debug log exported to console");
	};
	const testKnownGoodLocations = async () => {
		const testLocations = [
			{ lat: 40.7128, lon: -74.006, name: "New York City" },
			{ lat: 34.0522, lon: -118.2437, name: "Los Angeles" },
			{ lat: 51.5074, lon: -0.1278, name: "London" },
		];
		setLoading(true);

		for (const testLoc of testLocations) {
			try {
				const location = debugLocationService.setManualLocation(
					testLoc.lat,
					testLoc.lon,
					testLoc.name
				);
				await weatherService.getWeatherWithDebug(location);
			} catch (error) {
				console.error(`Test failed for ${testLoc.name}:`, error);
			}
		}

		updateDebugReport();
		setLoading(false);
		Alert.alert("Complete", "Known location tests completed");
	};
	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="formSheet"
		>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Location Debug Panel</Text>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Text style={styles.closeButtonText}>Close</Text>
					</TouchableOpacity>
				</View>
				<ScrollView style={styles.content}>
					{/* Test Controls */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Test Controls</Text>

						<TouchableOpacity
							style={[styles.button, loading && styles.buttonDisabled]}
							onPress={testCurrentLocation}
							disabled={loading}
						>
							<Text style={styles.buttonText}>Test Current Location</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, loading && styles.buttonDisabled]}
							onPress={testKnownGoodLocations}
							disabled={loading}
						>
							<Text style={styles.buttonText}>Test Known Good Locations</Text>
						</TouchableOpacity>
						<View style={styles.manualTestSection}>
							<Text style={styles.label}>Manual Location Test:</Text>
							<View style={styles.inputRow}>
								<TextInput
									style={styles.input}
									placeholder="Latitude"
									value={testLatitude}
									onChangeText={setTestLatitude}
									keyboardType="numeric"
								/>
								<TextInput
									style={styles.input}
									placeholder="Longitude"
									value={testLongitude}
									onChangeText={setTestLongitude}
									keyboardType="numeric"
								/>
							</View>
							<TouchableOpacity
								style={[styles.button, loading && styles.buttonDisabled]}
								onPress={testManualLocation}
								disabled={loading}
							>
								<Text style={styles.buttonText}>Test Manual Location</Text>
							</TouchableOpacity>
						</View>
					</View>
					{/* Debug Controls */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Debug Controls</Text>

						<TouchableOpacity style={styles.button} onPress={updateDebugReport}>
							<Text style={styles.buttonText}>Refresh Debug Report</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.button} onPress={clearDebugLog}>
							<Text style={styles.buttonText}>Clear Debug Log</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.button} onPress={exportDebugLog}>
							<Text style={styles.buttonText}>Export Debug Log</Text>
						</TouchableOpacity>
					</View>
					{/* Debug Report */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Debug Report</Text>
						<ScrollView style={styles.reportContainer}>
							<Text style={styles.reportText}>
								{debugReport || "No debug data available"}
							</Text>
						</ScrollView>
					</View>
				</ScrollView>
			</View>
		</Modal>
	);
};
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 20,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
	},
	closeButton: {
		padding: 8,
	},
	closeButtonText: {
		color: "#007AFF",
		fontSize: 16,
	},
	content: {
		flex: 1,
		padding: 20,
	},
	section: {
		marginBottom: 30,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 15,
		color: "#333",
	},
	button: {
		backgroundColor: "#007AFF",
		padding: 15,
		borderRadius: 8,
		marginBottom: 10,
		alignItems: "center",
	},
	buttonDisabled: {
		backgroundColor: "#ccc",
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "500",
	},
	manualTestSection: {
		marginTop: 20,
		padding: 15,
		backgroundColor: "white",
		borderRadius: 8,
	},
	label: {
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 10,
	},
	inputRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 15,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 4,
		padding: 10,
		fontSize: 16,
	},
	reportContainer: {
		backgroundColor: "white",
		padding: 15,
		borderRadius: 8,
		maxHeight: 300,
	},
	reportText: {
		fontFamily: "monospace",
		fontSize: 12,
		lineHeight: 16,
	},
});
