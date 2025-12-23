import { InsightError } from "./IInsightFacade";

const GEO_API_URL = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team119/";

export default class GeoService {
	/**
	 * fetch lat and lon according to address
	 * @param address the address of building
	 * @returns Promise<{ lat: number, lon: number }>
	 */
	public static async getGeoLocation(address: string): Promise<{ lat: number; lon: number }> {
		if (!address || address.trim().length === 0) {
			throw new InsightError("Invalid address");
		}

		const encodedAddress = encodeURIComponent(address.trim());

		try {
			const response = await fetch(GEO_API_URL + encodedAddress);
			if (!response.ok) {
				throw new InsightError(`Geolocation API error: ${response.status}`);
			}

			const data = await response.json();
			if (typeof data.lat !== "number" || typeof data.lon !== "number") {
				throw new InsightError("Invalid geolocation data format");
			}

			return { lat: data.lat, lon: data.lon };
		} catch (err) {
			throw new InsightError("Failed to fetch geolocation: " + String(err));
		}
	}
}
