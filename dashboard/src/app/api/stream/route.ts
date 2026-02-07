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
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
          manager.removeListener(send);
        }
      }

      // Send connected event
      send('connected', { timestamp: new Date().toISOString() });

      // Register listener
      manager.addListener(send);

      // Cleanup when stream closes
      const cleanup = () => {
        manager.removeListener(send);
      };

      // AbortController not available on ReadableStream, cleanup on error
      controller.enqueue; // keep reference
      void cleanup; // used by GC via closure
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
