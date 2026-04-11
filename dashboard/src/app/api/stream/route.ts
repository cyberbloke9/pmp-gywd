import { getSSEManager } from '@/lib/sse-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const manager = getSSEManager();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Stream closed
          manager.removeListener(send);
        }
      }

      // Send connected event with source info
      send('connected', {
        timestamp: new Date().toISOString(),
        source: manager.getMode(),
      });

      // Replay buffered events to this new listener
      manager.replayTo(send);

      // Register for future events
      manager.addListener(send);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
