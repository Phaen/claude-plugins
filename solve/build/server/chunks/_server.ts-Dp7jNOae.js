import { b as buildPayload, u as unsubscribe, s as subscribe } from './state-BRDE0lKF.js';
import 'fs';
import 'path';
import 'os';

//#region src/routes/events/+server.ts
function GET() {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(": connected\n\n"));
			controller.enqueue(encoder.encode(`data: ${JSON.stringify(buildPayload())}\n\n`));
			const onData = (data) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					cleanup();
				}
			};
			const keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": keepalive\n\n"));
				} catch {
					cleanup();
				}
			}, 15e3);
			function cleanup() {
				clearInterval(keepalive);
				unsubscribe(onData);
			}
			subscribe(onData);
			stream.__cleanup = cleanup;
		},
		cancel() {
			const cleanup = stream.__cleanup;
			if (cleanup) cleanup();
		}
	});
	return new Response(stream, { headers: {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"X-Accel-Buffering": "no",
		Connection: "keep-alive"
	} });
}

export { GET };
//# sourceMappingURL=_server.ts-Dp7jNOae.js.map
