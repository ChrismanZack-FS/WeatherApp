import { StyleSheet } from "react-native";
import QRCodeScanner from "../../components/QRCodeScanner";

export default function TabTwoScreen() {
	return <QRCodeScanner onCodeScanned={() => {}} onClose={() => {}} />;
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
