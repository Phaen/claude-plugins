import { d as deleteSession } from './state-BRDE0lKF.js';
import 'fs';
import 'path';
import 'os';

//#region src/routes/session/[id]/+server.ts
var DELETE = async ({ params }) => {
	deleteSession(params.id);
	return new Response(null, { status: 200 });
};

export { DELETE };
//# sourceMappingURL=_server.ts-C7K6ymC3.js.map
