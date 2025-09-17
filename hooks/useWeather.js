import { useQuery, useQueryClient } from "@tanstack/react-query";
import weatherService from "../services/weatherService";
export const useCurrentWeather = (lat, lon, options = {}) => {
	return useQuery({
		queryKey: ["weather", "current", lat, lon],
		queryFn: () => weatherService.getCurrentWeather(lat, lon, options),
		enabled: !!(lat && lon),
		staleTime: 10 * 60 * 1000, // 10 minutes
		cacheTime: 30 * 60 * 1000, // 30 minutes
		retry: (failureCount, error) => {
			// Don't retry on auth errors or not found
			if (error.type === "AUTH_ERROR" || error.type === "NOT_FOUND") {
				return false;
			}
			return failureCount < 3;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});
};
export const useForecast = (lat, lon, options = {}) => {
	return useQuery({
		queryKey: ["weather", "forecast", lat, lon],
		queryFn: () => weatherService.getForecast(lat, lon, options),
		enabled: !!(lat && lon),
		staleTime: 30 * 60 * 1000, // 30 minutes
		cacheTime: 60 * 60 * 1000, // 1 hour
	});
};
export const useWeatherByCity = (cityName, options = {}) => {
	return useQuery({
		queryKey: ["weather", "city", cityName],
		queryFn: () => weatherService.getWeatherByCity(cityName, options),
		enabled: !!cityName,
		staleTime: 10 * 60 * 1000,
		cacheTime: 30 * 60 * 1000,
	});
};
// Hook for refreshing weather data
export const useRefreshWeather = () => {
	const queryClient = useQueryClient();

	return {
		refreshAll: () => {
			queryClient.invalidateQueries(["weather"]);
		},
		refreshCurrent: (lat, lon) => {
			queryClient.invalidateQueries(["weather", "current", lat, lon]);
		},
		refreshForecast: (lat, lon) => {
			queryClient.invalidateQueries(["weather", "forecast", lat, lon]);
		},
	};
};
