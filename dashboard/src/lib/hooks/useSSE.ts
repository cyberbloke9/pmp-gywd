'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SSEState {
  connected: boolean;
  lastEvent: { type: string; data: unknown } | null;
  error: string | null;
}

export function useSSE(url: string = '/api/stream'): SSEState {
  const [state, setState] = useState<SSEState>({
    connected: false,
    lastEvent: null,
    error: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('connected', (e) => {
        setState((prev) => ({
          ...prev,
          connected: true,
          error: null,
          lastEvent: { type: 'connected', data: JSON.parse(e.data) },
        }));
      });

      es.addEventListener('state_changed', (e) => {
        setState((prev) => ({
          ...prev,
          lastEvent: { type: 'state_changed', data: JSON.parse(e.data) },
        }));
      });

      es.addEventListener('patterns_updated', (e) => {
        setState((prev) => ({
          ...prev,
          lastEvent: { type: 'patterns_updated', data: JSON.parse(e.data) },
        }));
      });

      es.addEventListener('heartbeat', (e) => {
        setState((prev) => ({
          ...prev,
          lastEvent: { type: 'heartbeat', data: JSON.parse(e.data) },
        }));
      });

      es.onerror = () => {
        setState((prev) => ({
          ...prev,
          connected: false,
          error: 'Connection lost',
        }));
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: String(err),
      }));
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return state;
}
