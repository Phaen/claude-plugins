import { json } from '@sveltejs/kit';
import { buildPayload } from '$lib/server/state.js';

export function GET() {
	return json(buildPayload());
}
