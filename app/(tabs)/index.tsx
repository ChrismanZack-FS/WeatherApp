import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import WeatherCard from "../../components/WeatherCard";
import locationService, {
	LocationCoordinates,
} from "../../services/locationService";

export default function HomeScreen() {
	const [location, setLocation] = useState<LocationCoordinates | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		async function fetchLocation() {
			try {
				setLoading(true);
				const loc = await locationService.getCurrentLocation();
				setLocation(loc);
			} catch (err) {
				if (err instanceof Error) {
					setError(err);
				} else {
					setError(new Error("Unknown error"));
				}
			} finally {
				setLoading(false);
			}
		}
		fetchLocation();
	}, []);

	if (loading) {
		return null;
	}
	if (error) {
		return null;
	}
	return (
		<WeatherCard
			location={location}
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
