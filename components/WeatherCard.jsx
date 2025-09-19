import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import weatherService from "../services/weatherservices.js";
const WeatherCard = ({
	location,
	onLocationPress,
	showForecast = false,
	style,
}) => {
	const [weather, setWeather] = useState(null);
	const [forecast, setForecast] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);
	useEffect(() => {
		if (location) {
			console.log("WeatherCard location prop:", location);
			loadWeatherData();
		}
	}, [location]);
	const loadWeatherData = async (forceRefresh = false) => {
		try {
			setLoading(!forceRefresh);
			setRefreshing(forceRefresh);
			setError(null);
			// Support both { lat, lon } and { latitude, longitude }
			const lat = location.lat ?? location.latitude;
			const lon = location.lon ?? location.longitude;
			console.log("WeatherCard using lat/lon:", lat, lon);

			// Load current weather
			const currentWeather = await weatherService.getCurrentWeather(lat, lon, {
				forceRefresh,
			});
			setWeather(currentWeather);
			// Load forecast if requested
			if (showForecast) {
				const forecastData = await weatherService.getForecast(lat, lon, {
					forceRefresh,
				});
				setForecast(forecastData);
			}
		} catch (err) {
			console.error("Weather loading error:", err);
			setError(err);

			// Show user-friendly error message
			if (err.retryable) {
				Alert.alert("Weather Update Failed", err.message, [
					{ text: "Cancel", style: "cancel" },
					{ text: "Retry", onPress: () => loadWeatherData(true) },
				]);
			} else {
				Alert.alert("Weather Error", err.message);
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};
	const handleRefresh = () => {
		loadWeatherData(true);
	};
	if (loading && !weather) {
		return (
			<View style={[styles.container, styles.loadingContainer, style]}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={styles.loadingText}>Loading weather...</Text>
			</View>
		);
	}
	if (error && !weather) {
		return (
			<View style={[styles.container, styles.errorContainer, style]}>
				<Ionicons name="cloud-offline" size={48} color="#FF3B30" />
				<Text style={styles.errorTitle}>Weather Unavailable</Text>
				<Text style={styles.errorMessage}>{error.message}</Text>
				<TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
					<Text style={styles.retryButtonText}>Try Again</Text>
				</TouchableOpacity>
			</View>
		);
	}
	if (!weather) return null;
	return (
		<TouchableOpacity
			style={[styles.container, style]}
			onPress={onLocationPress}
			activeOpacity={0.8}
		>
			{/* Header with location and refresh */}
			<View style={styles.header}>
				<View style={styles.locationInfo}>
					<Text style={styles.cityName}>{weather.cityName}</Text>
					<Text style={styles.country}>{weather.country}</Text>
				</View>

				<TouchableOpacity
					style={styles.refreshButton}
					onPress={handleRefresh}
					disabled={refreshing}
				>
					<Ionicons
						name="refresh"
						size={20}
						color="#007AFF"
						style={refreshing && styles.spinning}
					/>
				</TouchableOpacity>
			</View>
			{/* Current weather */}
			<View style={styles.currentWeather}>
				<View style={styles.temperatureSection}>
					<Text style={styles.temperature}>{weather.temperature.current}°</Text>
					<Text style={styles.feelsLike}>
						Feels like {weather.temperature.feelsLike}°
					</Text>
				</View>
				<View style={styles.weatherIcon}>
					<Image
						source={{ uri: weather.weather.iconUrl }}
						style={styles.iconImage}
						resizeMode="contain"
					/>
					<Text style={styles.description}>{weather.weather.description}</Text>
				</View>
			</View>
			{/* Weather details */}
			<View style={styles.details}>
				<WeatherDetail
					icon="thermometer"
					label="Range"
					value={`${weather.temperature.min}° - ${weather.temperature.max}°`}
				/>
				<WeatherDetail
					icon="water"
					label="Humidity"
					value={`${weather.humidity}%`}
				/>
				<WeatherDetail
					icon="eye"
					label="Visibility"
					value={`${Math.round(weather.visibility / 1000)} km`}
				/>
				<WeatherDetail
					icon="speedometer"
					label="Pressure"
					value={`${weather.pressure} hPa`}
				/>
			</View>
			{/* Wind information */}
			<View style={styles.windInfo}>
				<Ionicons name="leaf" size={16} color="#666" />
				<Text style={styles.windText}>
					Wind: {weather.wind.speed} m/s{" "}
					{getWindDirection(weather.wind.direction)}
				</Text>
			</View>
			{/* Stale data indicator */}
			{weather.isStale && (
				<View style={styles.staleIndicator}>
					<Ionicons name="warning" size={14} color="#FF9500" />
					<Text style={styles.staleText}>Data may be outdated</Text>
				</View>
			)}
			{/* Forecast preview */}
			{showForecast && forecast && (
				<View style={styles.forecastPreview}>
					<Text style={styles.forecastTitle}>5-Day Forecast</Text>
					<View style={styles.forecastList}>
						{forecast.forecasts
							.filter((_, index) => index % 8 === 0) // Daily forecast (every 8th 3-hour period)
							.slice(0, 5)
							.map((item, index) => (
								<ForecastItem key={index} forecast={item} />
							))}
					</View>
				</View>
			)}
		</TouchableOpacity>
	);
};
// Helper component for weather details
const WeatherDetail = ({ icon, label, value }) => (
	<View style={styles.detailItem}>
		<Ionicons name={icon} size={16} color="#666" />
		<Text style={styles.detailLabel}>{label}</Text>
		<Text style={styles.detailValue}>{value}</Text>
	</View>
);
// Helper component for forecast items

const ForecastItem = ({ forecast }) => {
	let dateObj = forecast.datetime;
	if (!(dateObj instanceof Date)) {
		dateObj = new Date(dateObj);
	}
	return (
		<View style={styles.forecastItem}>
			<Text style={styles.forecastDay}>
				{dateObj.toLocaleDateString("en", { weekday: "short" })}
			</Text>
			<Image
				source={{ uri: forecast.weather.iconUrl }}
				style={styles.forecastIcon}
			/>
			<Text style={styles.forecastTemp}>
				{forecast.temperature.max}°/{forecast.temperature.min}°
			</Text>
		</View>
	);
};

// Helper function for wind direction
const getWindDirection = (degrees) => {
	const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
	const index = Math.round(degrees / 45) % 8;
	return directions[index];
};
const styles = StyleSheet.create({
	container: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginTop: 60,
		marginVertical: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	loadingContainer: {
		alignItems: "center",
		justifyContent: "center",
		minHeight: 120,
	},
	loadingText: {
		marginTop: 8,
		color: "#666",
		fontSize: 14,
	},
	errorContainer: {
		alignItems: "center",
		justifyContent: "center",
		minHeight: 120,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#FF3B30",
		marginTop: 8,
	},
	errorMessage: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginTop: 4,
		marginBottom: 16,
	},
	retryButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 8,
	},
	retryButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	locationInfo: {
		flex: 1,
	},
	cityName: {
		fontSize: 20,
		fontWeight: "700",
		color: "#000",
	},
	country: {
		fontSize: 14,
		color: "#666",
		marginTop: 2,
	},
	refreshButton: {
		padding: 8,
	},
	spinning: {
		transform: [{ rotate: "180deg" }],
	},
	currentWeather: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	temperatureSection: {
		flex: 1,
	},
	temperature: {
		fontSize: 48,
		fontWeight: "300",
		color: "#000",
	},
	feelsLike: {
		fontSize: 14,
		color: "#666",
		marginTop: 4,
	},
	weatherIcon: {
		alignItems: "center",
	},
	iconImage: {
		width: 80,
		height: 80,
	},
	description: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		textTransform: "capitalize",
		marginTop: 4,
	},
	details: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	detailItem: {
		flexDirection: "row",
		alignItems: "center",
		width: "48%",
		marginBottom: 8,
	},
	detailLabel: {
		fontSize: 12,
		color: "#666",
		marginLeft: 4,
		flex: 1,
	},
	detailValue: {
		fontSize: 12,
		fontWeight: "600",
		color: "#000",
	},
	windInfo: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	windText: {
		fontSize: 12,
		color: "#666",
		marginLeft: 4,
	},
	staleIndicator: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFF3CD",
		padding: 8,
		borderRadius: 6,
		marginTop: 8,
	},
	staleText: {
		fontSize: 12,
		color: "#856404",
		marginLeft: 4,
	},
	forecastPreview: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#E5E5E5",
	},
	forecastTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#000",
		marginBottom: 12,
	},
	forecastList: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	forecastItem: {
		alignItems: "center",
		flex: 1,
	},
	forecastDay: {
		fontSize: 12,
		color: "#666",
		marginBottom: 4,
	},
	forecastIcon: {
		width: 32,
		height: 32,
		marginBottom: 4,
	},
	forecastTemp: {
		fontSize: 11,
		color: "#000",
		textAlign: "center",
	},
});
export default WeatherCard;
