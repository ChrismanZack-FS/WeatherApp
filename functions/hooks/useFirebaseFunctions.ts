import { useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
interface FunctionCall<T = any, R = any> {
	loading: boolean;
	error: string | null;
	data: R | null;
	call: (params: T) => Promise<R>;
}
export function useFirebaseFunction<T = any, R = any>(
	functionName: string
): FunctionCall<T, R> {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<R | null>(null);
	const call = async (params: T): Promise<R> => {
		try {
			setLoading(true);
			setError(null);
			const functions = getFunctions();
			const callable = httpsCallable<T, R>(functions, functionName);

			const result = await callable(params);
			const responseData = result.data;

			setData(responseData);
			return responseData;
		} catch (err: any) {
			const errorMessage = err.message || "Function call failed";
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setLoading(false);
		}
	};
	return {
		loading,
		error,
		data,
		call,
	};
}
// Specific hooks for common functions
export function useWeatherFunction() {
	return useFirebaseFunction<
		{ latitude: number; longitude: number; units?: string },
		any
	>("getWeather");
}
export function useGeocodeFunction() {
	return useFirebaseFunction<
		{ address: string },
		{
			locations: Array<{
				address: string;
				coordinates: { latitude: number; longitude: number };
			}>;
		}
	>("geocodeAddress");
}
export function useUserProfileFunction() {
	return useFirebaseFunction<
		{ displayName?: string; photoURL?: string; preferences?: any },
		{ success: boolean; message: string }
	>("updateUserProfile");
}
