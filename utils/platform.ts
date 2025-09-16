import { Platform } from "react-native";
export const isWeb = Platform.OS === "web";
export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
export const isMobile = isIOS || isAndroid;
export const platformConfig = {
	headerHeight: isWeb ? 60 : 80,
	tabBarHeight: isWeb ? 50 : 80,
	buttonPadding: isWeb ? 8 : 12,
	fontSize: {
		small: isWeb ? 12 : 14,
		medium: isWeb ? 14 : 16,
		large: isWeb ? 18 : 20,
	},
};
