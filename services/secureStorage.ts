import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
class SecureStorageService {
	async setItem(key: string, value: string): Promise<void> {
		try {
			if (Platform.OS === "web") {
				// Fallback to localStorage on web (less secure)
				localStorage.setItem(key, value);
			} else {
				await SecureStore.setItemAsync(key, value);
			}
		} catch (error) {
			console.error("Error storing secure item:", error);
			throw error;
		}
	}
	async getItem(key: string): Promise<string | null> {
		try {
			if (Platform.OS === "web") {
				return localStorage.getItem(key);
			} else {
				return await SecureStore.getItemAsync(key);
			}
		} catch (error) {
			console.error("Error retrieving secure item:", error);
			return null;
		}
	}
	async deleteItem(key: string): Promise<void> {
		try {
			if (Platform.OS === "web") {
				localStorage.removeItem(key);
			} else {
				await SecureStore.deleteItemAsync(key);
			}
		} catch (error) {
			console.error("Error deleting secure item:", error);
			throw error;
		}
	}
	async clear(): Promise<void> {
		try {
			if (Platform.OS === "web") {
				localStorage.clear();
			} else {
				// SecureStore doesn't have a clear method, so we need to track keys
				console.warn("SecureStore clear not fully implemented");
			}
		} catch (error) {
			console.error("Error clearing secure storage:", error);
			throw error;
		}
	}
}
export default new SecureStorageService();
