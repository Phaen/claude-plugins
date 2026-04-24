import type { RequestHandler } from './$types.js';
import { deleteSession } from '$lib/server/state.js';

export const DELETE: RequestHandler = async ({ params }) => {
	deleteSession(params.id);
	return new Response(null, { status: 200 });
};
