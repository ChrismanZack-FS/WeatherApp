import React, { useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import { LocationDebugPanel } from "../../components/LocationDebugPanel";

const weatherApiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY || "";

export default function TabTwoScreen() {
	const [visible, setVisible] = useState(true);
	return (
		<View style={{ flex: 1 }}>
			<LocationDebugPanel
				visible={visible}
				onClose={() => setVisible(false)}
				weatherApiKey={weatherApiKey}
			/>
			{!visible && (
				<Button
					title="Open Location Debug Panel"
					onPress={() => setVisible(true)}
				/>
			)}
		</View>
	);
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
