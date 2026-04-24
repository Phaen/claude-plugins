import { buildPayload, subscribe, unsubscribe } from '$lib/server/state.js';

export function GET() {
	const encoder = new TextEncoder();
	let cleanupFn: (() => void) | undefined;

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(': connected\n\n'));
			controller.enqueue(encoder.encode(`data: ${JSON.stringify(buildPayload())}\n\n`));

			const onData = (data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					cleanupFn?.();
				}
			};

			const keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					cleanupFn?.();
				}
			}, 15000);

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

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no',
			Connection: 'keep-alive'
		}
	});
}
