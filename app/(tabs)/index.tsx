import { Image } from "expo-image";
import WeatherCard from "../../components/WeatherCard";
import { Platform, StyleSheet } from "react-native";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";

export default function HomeScreen() {
	return (
		<WeatherCard
			location={{ lat: 40.7128, lon: -74.006 }}
			onLocationPress={() => {}}
			showForecast={true}
			style={{ margin: 16 }}
		/>
	);
}

const styles = StyleSheet.create({
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	stepContainer: {
		gap: 8,
		marginBottom: 8,
	},
	reactLogo: {
		height: 178,
		width: 290,
		bottom: 0,
		left: 0,
		position: "absolute",
	},
});
