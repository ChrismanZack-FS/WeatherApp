import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
// Process incoming sensor data
export const processSensorData = functions
	.region("us-central1")
	.firestore.document("sensor_data/{userId}/readings/{readingId}")
	.onCreate(async (snapshot, context) => {
		try {
			const data = snapshot.data();
			const userId = context.params.userId;

			// Analyze sensor data for anomalies
			const analysis = await analyzeSensorData(data);

			if (analysis.hasAnomalies) {
				// Create alert
				await createAlert(userId, analysis);

				// Send notification
				await sendNotification(userId, analysis);
			}

			// Update user statistics
			await updateUserStats(userId, data);
		} catch (error) {
			console.error("Sensor data processing error:", error);
		}
	});
async function analyzeSensorData(data: any) {
	const { temperature, humidity, pressure, timestamp } = data;

	const anomalies = [];

	// Temperature checks
	if (temperature < -10 || temperature > 50) {
		anomalies.push({
			type: "temperature",
			value: temperature,
			severity: temperature < -20 || temperature > 60 ? "high" : "medium",
			message: `Extreme temperature: ${temperature}°C`,
		});
	}

	// Humidity checks
	if (humidity < 10 || humidity > 90) {
		anomalies.push({
			type: "humidity",
			value: humidity,
			severity: "medium",
			message: `Unusual humidity: ${humidity}%`,
		});
	}

	return {
		hasAnomalies: anomalies.length > 0,
		anomalies,
		timestamp: new Date(timestamp),
	};
}
async function createAlert(userId: string, analysis: any) {
	await admin.firestore().collection("alerts").add({
		userId,
		type: "sensor_anomaly",
		anomalies: analysis.anomalies,
		timestamp: admin.firestore.Timestamp.now(),
		read: false,
		acknowledged: false,
	});
}
async function sendNotification(userId: string, analysis: any) {
	const userDoc = await admin.firestore().collection("users").doc(userId).get();

	const userData = userDoc.data();
	const fcmTokens = userData?.fcmTokens || [];

	if (fcmTokens.length === 0) return;

	const highSeverityAnomalies = analysis.anomalies.filter(
		(a: any) => a.severity === "high"
	);

	if (highSeverityAnomalies.length > 0) {
		await admin.messaging().sendMulticast({
			tokens: fcmTokens,
			notification: {
				title: "Sensor Alert",
				body: highSeverityAnomalies[0].message,
			},
			data: {
				type: "sensor_alert",
				anomalies: JSON.stringify(analysis.anomalies),
			},
		});
	}
}
