import { StyleSheet } from "react-native";
import { TiltGame } from "../../components/TiltGame";

export default function TabTwoScreen() {
	return <TiltGame />;
}

const styles = StyleSheet.create({
	headerImage: {
		color: "#808080",
		bottom: -90,
		left: -35,
		position: "absolute",
	},
	titleContainer: {
		flexDirection: "row",
		gap: 8,
	},
});
