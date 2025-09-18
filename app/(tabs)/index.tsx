
import { StyleSheet } from "react-native";
import WeatherCard from "../../components/WeatherCard";


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
