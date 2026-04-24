import { b as buildPayload, s as subscribe, u as unsubscribe } from './state-BRDE0lKF.js';
import 'fs';
import 'path';
import 'os';

//#region src/routes/events/+server.ts
function GET() {
	const encoder = new TextEncoder();
	let cleanupFn;
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(": connected\n\n"));
			controller.enqueue(encoder.encode(`data: ${JSON.stringify(buildPayload())}\n\n`));
			const onData = (data) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					cleanupFn?.();
				}
			};
			const keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": keepalive\n\n"));
				} catch {
					cleanupFn?.();
				}
			}, 15e3);
			cleanupFn = () => {
				clearInterval(keepalive);
				unsubscribe(onData);
			};
			subscribe(onData);
		},
		cancel() {
			cleanupFn?.();
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
//# sourceMappingURL=_server.ts-BfFR65gK.js.map
