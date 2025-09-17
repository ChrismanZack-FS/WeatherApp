import { Camera } from "expo-camera";
import * as Haptics from "expo-haptics";
class BarcodeService {
	constructor() {
		this.isScanning = true;
		this.scannedCodes = new Set();
		this.scanHistory = [];
	}
	// Request camera permissions for barcode scanning
	async requestPermissions() {
		try {
			const { status } = await Camera.requestCameraPermissionsAsync();
			const result = {
				granted: status === "granted",
				canScan: status === "granted",
			};
			console.log("📱 Camera permissions:", result);
			return result;
		} catch (error) {
			console.error("❌ Error requesting camera permissions:", error);
			return {
				granted: false,
				canScan: false,
				error: error.message,
			};
		}
	}
	// Get supported barcode types (as strings for expo-camera)
	getSupportedBarcodeTypes() {
		return [
			"qr",
			"pdf417",
			"aztec",
			"ean13",
			"ean8",
			"upc_e",
			"code39",
			"code128",
			"code93",
			"codabar",
			"datamatrix",
			"itf14",
		];
	}
	// Process scanned barcode
	processScanResult(scanResult, options = {}) {
		const { type, data, bounds } = scanResult;

		// Prevent duplicate scans
		if (!options.allowDuplicates && this.scannedCodes.has(data)) {
			return null;
		}
		// Add to scanned codes set
		this.scannedCodes.add(data);
		// Create processed result
		const processedResult = {
			id: Date.now().toString(),
			type,
			data,
			bounds,
			timestamp: new Date(),
			processed: this.processQRCodeData(data),
			isValid: this.validateBarcodeData(type, data),
		};
		// Add to scan history
		this.scanHistory.unshift(processedResult);

		// Keep only last 100 scans
		if (this.scanHistory.length > 100) {
			this.scanHistory = this.scanHistory.slice(0, 100);
		}
		// Haptic feedback
		if (options.hapticFeedback !== false) {
			Haptics.notificationAsync(
				processedResult.isValid
					? Haptics.NotificationFeedbackType.Success
					: Haptics.NotificationFeedbackType.Warning
			);
		}
		console.log("📱 Barcode scanned:", processedResult);
		return processedResult;
	}
	// Process QR code data to extract structured information
	processQRCodeData(data) {
		const processed = {
			raw: data,
			type: "unknown",
			structured: null,
		};
		try {
			// URL detection
			if (this.isValidUrl(data)) {
				processed.type = "url";
				processed.structured = {
					url: data,
					domain: new URL(data).hostname,
				};
				return processed;
			}
			// Email detection
			if (data.startsWith("mailto:")) {
				processed.type = "email";
				const emailMatch = data.match(/mailto:([^?]+)/);
				if (emailMatch) {
					processed.structured = {
						email: emailMatch[1],
						subject: this.extractUrlParam(data, "subject"),
						body: this.extractUrlParam(data, "body"),
					};
				}
				return processed;
			}
			// Phone number detection
			if (data.startsWith("tel:")) {
				processed.type = "phone";
				processed.structured = {
					phone: data.replace("tel:", ""),
				};
				return processed;
			}
			// SMS detection
			if (data.startsWith("sms:")) {
				processed.type = "sms";
				const smsMatch = data.match(/sms:([^?]+)/);
				if (smsMatch) {
					processed.structured = {
						phone: smsMatch[1],
						message: this.extractUrlParam(data, "body"),
					};
				}
				return processed;
			}
			// WiFi network detection
			if (data.startsWith("WIFI:")) {
				processed.type = "wifi";
				processed.structured = this.parseWifiQR(data);
				return processed;
			}
			// vCard contact detection
			if (data.startsWith("BEGIN:VCARD")) {
				processed.type = "contact";
				processed.structured = this.parseVCard(data);
				return processed;
			}
			// Event/Calendar detection
			if (data.startsWith("BEGIN:VEVENT")) {
				processed.type = "event";
				processed.structured = this.parseVEvent(data);
				return processed;
			}
			// Geographic location detection
			if (data.startsWith("geo:")) {
				processed.type = "location";
				const geoMatch = data.match(/geo:([^,]+),([^,?]+)/);
				if (geoMatch) {
					processed.structured = {
						latitude: parseFloat(geoMatch[1]),
						longitude: parseFloat(geoMatch[2]),
					};
				}
				return processed;
			}
			// JSON detection
			if (data.trim().startsWith("{") && data.trim().endsWith("}")) {
				try {
					processed.type = "json";
					processed.structured = JSON.parse(data);
					return processed;
				} catch (e) {
					// Not valid JSON, treat as text
				}
			}
			// Default to text
			processed.type = "text";
			processed.structured = { text: data };
		} catch (error) {
			console.error("Error processing QR code data:", error);
			processed.type = "text";
			processed.structured = { text: data };
		}
		return processed;
	}
	// Validate barcode data based on type (using string types)
	validateBarcodeData(type, data) {
		try {
			switch (type) {
				case "qr":
					return data.length > 0;
				case "ean13":
					return /^\d{13}$/.test(data);
				case "ean8":
					return /^\d{8}$/.test(data);
				case "upc_e":
					return /^\d{8}$/.test(data);
				case "code39":
				case "code128":
				case "code93":
					return data.length > 0;
				default:
					return data.length > 0;
			}
		} catch (error) {
			console.error("Error validating barcode data:", error);
			return false;
		}
	}
	// Helper methods
	isValidUrl(string) {
		try {
			new URL(string);
			return true;
		} catch (_) {
			return false;
		}
	}
	extractUrlParam(url, param) {
		try {
			const urlObj = new URL(url);
			return urlObj.searchParams.get(param);
		} catch (_) {
			return null;
		}
	}
	parseWifiQR(data) {
		// WIFI:T:WPA;S:MyNetwork;P:MyPassword;H:false;
		const result = {};
		const matches = data.match(
			/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);H:([^;]*);?/
		);

		if (matches) {
			result.security = matches[1];
			result.ssid = matches[2];
			result.password = matches[3];
			result.hidden = matches[4] === "true";
		}

		return result;
	}
	parseVCard(data) {
		const result = {};
		const lines = data.split("\n");

		lines.forEach((line) => {
			if (line.startsWith("FN:")) {
				result.name = line.substring(3);
			} else if (line.startsWith("TEL:")) {
				result.phone = line.substring(4);
			} else if (line.startsWith("EMAIL:")) {
				result.email = line.substring(6);
			} else if (line.startsWith("ORG:")) {
				result.organization = line.substring(4);
			}
		});

		return result;
	}
	parseVEvent(data) {
		const result = {};
		const lines = data.split("\n");

		lines.forEach((line) => {
			if (line.startsWith("SUMMARY:")) {
				result.title = line.substring(8);
			} else if (line.startsWith("DTSTART:")) {
				result.startDate = line.substring(8);
			} else if (line.startsWith("DTEND:")) {
				result.endDate = line.substring(6);
			} else if (line.startsWith("LOCATION:")) {
				result.location = line.substring(9);
			}
		});

		return result;
	}
	// Get scan history
	getScanHistory(limit = 10) {
		return this.scanHistory.slice(0, limit);
	}
	// Clear scan history
	clearScanHistory() {
		this.scanHistory = [];
		this.scannedCodes.clear();
		console.log("🗑️ Scan history cleared");
	}
	// Reset scanner state
	resetScanner() {
		this.scannedCodes.clear();
		this.isScanning = true;
	}
	// Set scanning state
	setScanning(isScanning) {
		this.isScanning = isScanning;
	}
}
export default new BarcodeService();
