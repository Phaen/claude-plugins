import { buildPayload, subscribe, unsubscribe } from '$lib/server/state.js';

export function GET() {
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(': connected\n\n'));
			controller.enqueue(encoder.encode(`data: ${JSON.stringify(buildPayload())}\n\n`));

			const onData = (data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					cleanup();
				}
			};

			const keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					cleanup();
				}
			}, 15000);

			function cleanup() {
				clearInterval(keepalive);
				unsubscribe(onData);
			}

			subscribe(onData);

			// Store cleanup for cancel
			(stream as unknown as Record<string, () => void>).__cleanup = cleanup;
		},
		cancel() {
			const cleanup = (stream as unknown as Record<string, () => void>).__cleanup;
			if (cleanup) cleanup();
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
