import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import locationService from "../../services/locationService";

let MapView: any, Marker: any, Polyline: any;
if (Platform.OS !== "web") {
	const rnMaps = require("react-native-maps");
	MapView = rnMaps.default;
	Marker = rnMaps.Marker;
	Polyline = rnMaps.Polyline;
}

const MapScreen: React.FC = () => {
	const [region, setRegion] = useState<any>(null);
	const [markers, setMarkers] = useState<
		{ coordinate: { latitude: number; longitude: number }; title?: string }[]
	>([]);
	const [route, setRoute] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchLocation() {
			try {
				setLoading(true);
				setError(null);
				const loc = await locationService.getCurrentLocation();
				if (loc) {
					setRegion({
						latitude: loc.latitude,
						longitude: loc.longitude,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01,
					});
					setMarkers([
						{
							coordinate: { latitude: loc.latitude, longitude: loc.longitude },
							title: "My Location",
						},
					]);
				} else {
					setError("Could not get location");
				}
			} catch (err) {
				setError("Could not get location");
			} finally {
				setLoading(false);
			}
		}
		fetchLocation();
	}, []);

	if (Platform.OS === "web") {
		return (
			<View style={{ flex: 1 }}>
				<iframe
					src="https://www.google.com/maps"
					style={{ width: "100%", height: "100%", border: "none" }}
					title="Web Map"
				/>
				<Text
					style={{
						position: "absolute",
						top: 10,
						left: 10,
						backgroundColor: "#fff",
						padding: 4,
						borderRadius: 4,
						fontSize: 12,
					}}
				>
					Platform: {Platform.OS}
				</Text>
			</View>
		);
	}

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text>Loading your location...</Text>
			</View>
		);
	}
	if (error || !region) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text>{error || "Could not get location"}</Text>
			</View>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			<MapView style={styles.map} region={region}>
				{markers.map((marker, idx) => (
					<Marker
						key={idx}
						coordinate={marker.coordinate}
						title={marker.title}
					/>
				))}
				{route.length > 0 && (
					<Polyline coordinates={route} strokeColor="#007AFF" strokeWidth={3} />
				)}
			</MapView>
			<Text
				style={{
					position: "absolute",
					top: 10,
					left: 10,
					backgroundColor: "#fff",
					padding: 4,
					borderRadius: 4,
					fontSize: 12,
				}}
			>
				Platform: {Platform.OS}
			</Text>
		</View>
	);
};
const styles = StyleSheet.create({
	map: { flex: 1 },
});
export default MapScreen;
