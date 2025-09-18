import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
// Webhook handler for third-party service notifications
export const handleWebhook = functions
	.region("us-central1")
	.runWith({
		timeoutSeconds: 60,
		memory: "512MB",
	})
	.https.onRequest(async (req: Request, res: Response) => {
		try {
			// Verify webhook signature for security
			const signature = req.headers["x-webhook-signature"] as string;
			const webhookSecret = functions.config().webhook.secret;

			if (
				!verifyWebhookSignature(
					JSON.stringify(req.body),
					signature,
					webhookSecret
				)
			) {
				res.status(401).json({ error: "Invalid signature" });
				return;
			}
			const { type, data } = req.body;
			switch (type) {
				case "weather_alert":
					await handleWeatherAlert(data);
					break;

				case "location_update":
					await handleLocationUpdate(data);
					break;

				case "user_action":
					await handleUserAction(data);
					break;

				default:
					console.warn("Unknown webhook type:", type);
			}
			res.status(200).json({ success: true });
		} catch (error) {
			console.error("Webhook error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	});
// Process weather alerts and send notifications
async function handleWeatherAlert(data: any) {
	const { userId, alertType, location, severity } = data;
	// Get user's notification preferences
	const userDoc = await admin.firestore().collection("users").doc(userId).get();
	const userData = userDoc.data();
	if (!userData?.preferences?.notifications) {
		return; // User has disabled notifications
	}
	// Create notification payload
	const notification = {
		title: getAlertTitle(alertType, severity),
		body: `Weather alert for ${location}`,
		data: {
			type: "weather_alert",
			alertType,
			location,
			severity,
		},
	};
	// Send push notification
	const userTokens = userData.fcmTokens || [];
	if (userTokens.length > 0) {
		await admin.messaging().sendEachForMulticast({
			tokens: userTokens,
			notification,
			data: notification.data,
			android: {
				priority: "high",
				notification: {
					channelId: "weather_alerts",
					priority: "high",
				},
			},
			apns: {
				payload: {
					aps: {
						alert: {
							title: notification.title,
							body: notification.body,
						},
						sound: "default",
						badge: 1,
					},
				},
			},
		});
	}
	// Store alert in user's alerts collection
	await admin
		.firestore()
		.collection("users")
		.doc(userId)
		.collection("alerts")
		.add({
			type: alertType,
			location,
			severity,
			title: notification.title,
			body: notification.body,
			timestamp: admin.firestore.Timestamp.now(),
			read: false,
		});
}
// Process location updates for geofence monitoring
async function handleLocationUpdate(data: any) {
	const { userId, latitude, longitude, timestamp } = data;
	// Check for geofence violations
	const geofences = await admin
		.firestore()
		.collection("geofences")
		.where("userId", "==", userId)
		.where("active", "==", true)
		.get();
	for (const geofenceDoc of geofences.docs) {
		const geofence = geofenceDoc.data();
		const distance = calculateDistance(
			{ latitude, longitude },
			{ latitude: geofence.latitude, longitude: geofence.longitude }
		);
		if (distance <= geofence.radius) {
			// User entered geofence
			await handleGeofenceEvent(userId, geofence, "enter", {
				latitude,
				longitude,
			});
		}
	}
	// Store location update
	await admin
		.firestore()
		.collection("location_history")
		.add({
			userId,
			latitude,
			longitude,
			timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)),
			accuracy: data.accuracy || null,
			speed: data.speed || null,
		});
}
// Process user actions for analytics
async function handleUserAction(data: any) {
	const { userId, action, metadata } = data;
	await admin.firestore().collection("user_actions").add({
		userId,
		action,
		metadata,
		timestamp: admin.firestore.Timestamp.now(),
	});
	// Update user engagement metrics
	await admin
		.firestore()
		.collection("users")
		.doc(userId)
		.update({
			lastActive: admin.firestore.Timestamp.now(),
			[`actionCounts.${action}`]: admin.firestore.FieldValue.increment(1),
		});
}
// Helper functions
function verifyWebhookSignature(
	payload: string,
	signature: string,
	secret: string
): boolean {
	const crypto = require("crypto");
	const expectedSignature = crypto
		.createHmac("sha256", secret)
		.update(payload)
		.digest("hex");

	return crypto.timingSafeEqual(
		Buffer.from(signature, "hex"),
		Buffer.from(expectedSignature, "hex")
	);
}
function getAlertTitle(alertType: string, severity: string): string {
	const titles: { [key: string]: string } = {
		storm: "Storm Warning",
		rain: "Rain Alert",
		snow: "Snow Advisory",
		temperature: "Temperature Alert",
	};

	return `${severity.toUpperCase()}: ${titles[alertType] || "Weather Alert"}`;
}
function calculateDistance(
	coord1: { latitude: number; longitude: number },
	coord2: { latitude: number; longitude: number }
): number {
	const R = 6371000; // Earth's radius in meters
	const dLat = toRadians(coord2.latitude - coord1.latitude);
	const dLon = toRadians(coord2.longitude - coord1.longitude);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(coord1.latitude)) *
			Math.cos(toRadians(coord2.latitude)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}
