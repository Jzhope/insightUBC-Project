// src/model/Room.ts
export interface Room {
	rooms_fullname: string;
	rooms_shortname: string;
	rooms_address: string;
	rooms_lat: number;
	rooms_lon: number;

	rooms_number: string;
	rooms_name: string;
	rooms_seats: number;
	rooms_type: string;
	rooms_furniture: string;
	rooms_href: string;
}

export type RoomRow = Room;

export const ROOM_NUMERIC_FIELDS: Array<keyof Room> = ["rooms_lat", "rooms_lon", "rooms_seats"];

export const ROOM_STRING_FIELDS: Array<keyof Room> = [
	"rooms_fullname",
	"rooms_shortname",
	"rooms_address",
	"rooms_number",
	"rooms_name",
	"rooms_type",
	"rooms_furniture",
	"rooms_href",
];

export function isRoomNumericField(k: keyof Room): boolean {
	return ROOM_NUMERIC_FIELDS.includes(k);
}
