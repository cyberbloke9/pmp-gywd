import { getWsClient } from '@/lib/ws-client';
import { getSSEManager } from '@/lib/sse-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const wsClient = getWsClient();
  const useGateway = wsClient.isConnected();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Stream closed — clean up listeners
          cleanup();
        }
      }

      let unsubscribeWs: (() => void) | null = null;
      let cleanedUp = false;

      function cleanup() {
        if (cleanedUp) return;
        cleanedUp = true;
        if (unsubscribeWs) unsubscribeWs();
        sseManager?.removeListener(send);
      }

      // Send connected event
      send('connected', {
        timestamp: new Date().toISOString(),
        source: useGateway ? 'gateway' : 'local',
      });

      if (useGateway) {
        // Proxy events from gateway WebSocket
        unsubscribeWs = wsClient.onEvent((wsEvent) => {
          // Skip internal gateway_connected events
          if (wsEvent.event === 'gateway_connected') return;
          send(wsEvent.event, wsEvent.data);
        });
      }

      // Always attach local SSE manager as fallback / supplement
      const sseManager = getSSEManager();
      if (!useGateway) {
        sseManager.addListener(send);
      }

      // Keep reference for cleanup
      void cleanup;
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
