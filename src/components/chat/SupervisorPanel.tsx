import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupervisorPanelProps {
  conversationId: string;
  lastLeadMessageAt: string | null;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_SERVER_API_KEY || '';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;
  return headers;
}

/**
 * Trigger button for the chat header.
 * Renders inline — just a button to toggle the panel.
 */
export function SupervisorTrigger({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}) {
  return (
    <Button
      variant={isOpen ? 'default' : 'outline'}
      size="sm"
      className={`h-8 gap-1.5 px-2 border shadow-sm shrink-0 ${
        isOpen
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20'
          : ''
      }`}
      onClick={() => onToggle(!isOpen)}
      title={isOpen ? 'Fechar Supervisora' : 'Abrir Supervisora de Vendas'}
    >
      <Bot size={14} className="text-amber-500" />
      <span className="text-xs hidden lg:inline">Supervisora</span>
    </Button>
  );
}

/**
 * Side panel that sits alongside the message area.
 * The parent layout should render this as a flex sibling.
 */
export default function SupervisorPanel({
  conversationId,
  lastLeadMessageAt,
  isOpen,
  onToggle,
}: SupervisorPanelProps) {
  const [guidance, setGuidance] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdatedRef = useRef<string | null>(null);
  const prevConversationIdRef = useRef<string>(conversationId);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchGuidance = useCallback(async () => {
    try {
      const res = await fetch(
        `${SERVER_URL}/api/conversations/${conversationId}/supervisor-guidance`,
        { headers: getHeaders() }
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        guidance: string | null;
        updated_at: string | null;
        supervisor_enabled: boolean;
      };

      if (data.updated_at && data.updated_at !== lastUpdatedRef.current) {
        lastUpdatedRef.current = data.updated_at;
        setFadeIn(false);
        setTimeout(() => setFadeIn(true), 50);
      }

      setGuidance(data.guidance);
      setUpdatedAt(data.updated_at);

      if (data.supervisor_enabled && lastLeadMessageAt) {
        const leadTime = new Date(lastLeadMessageAt).getTime();
        const guidanceTime = data.updated_at
          ? new Date(data.updated_at).getTime()
          : 0;
        const isGuidanceStale = guidanceTime < leadTime;
        const isRecentLead = Date.now() - leadTime < 60_000;
        setIsProcessing(isGuidanceStale && isRecentLead);
      } else {
        setIsProcessing(false);
      }
    } catch {
      // Silent fail
    }
  }, [conversationId, lastLeadMessageAt]);

  const startPolling = useCallback(() => {
    stopPolling();
    fetchGuidance();
    pollingRef.current = setInterval(fetchGuidance, 4000);
  }, [fetchGuidance, stopPolling]);

  // Toggle supervisor_enabled on the backend
  useEffect(() => {
    const toggleBackend = async () => {
      try {
        await fetch(
          `${SERVER_URL}/api/conversations/${conversationId}/supervisor-toggle`,
          {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ enabled: isOpen }),
          }
        );
      } catch {
        // Silent fail
      }
    };
    toggleBackend();

    if (isOpen) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [isOpen, conversationId, startPolling, stopPolling]);

  // Refetch when new lead message arrives and panel is open
  useEffect(() => {
    if (isOpen && lastLeadMessageAt) {
      fetchGuidance();
    }
  }, [lastLeadMessageAt, isOpen, fetchGuidance]);

  // Reset when conversation changes
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      setGuidance(null);
      setUpdatedAt(null);
      setIsProcessing(false);
      setFadeIn(true);
      lastUpdatedRef.current = null;
      stopPolling();
      if (isOpen) {
        startPolling();
      }
    }
  }, [conversationId, isOpen, stopPolling, startPolling]);

  if (!isOpen) return null;

  return (
    <div className="w-[280px] xl:w-[320px] border-l border-border flex flex-col bg-card shrink-0">
      {/* Header */}
      <div className="h-14 px-3 border-b border-border flex items-center gap-2 shrink-0">
        <Bot size={18} className="text-amber-500" />
        <span className="text-sm font-semibold flex-1 text-foreground">
          Supervisora IA
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => fetchGuidance()}
          title="Atualizar"
        >
          <RefreshCw size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggle(false)}
          title="Fechar"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {isProcessing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2
                size={16}
                className="animate-spin text-amber-500"
              />
              <span>Analisando conversa...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-full w-full animate-pulse" />
              <div className="h-3 bg-muted rounded-full w-4/5 animate-pulse" />
              <div className="h-3 bg-muted rounded-full w-3/5 animate-pulse" />
            </div>
            {guidance && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-1">
                  Orientação anterior:
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap opacity-60">
                  {guidance}
                </p>
              </div>
            )}
          </div>
        ) : guidance ? (
          <div
            className="transition-opacity duration-300"
            style={{ opacity: fadeIn ? 1 : 0.3 }}
          >
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {guidance}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Bot size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">
              A supervisora irá analisar as mensagens do lead e sugerir o
              próximo passo.
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {updatedAt && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            Atualizado às{' '}
            {format(new Date(updatedAt), 'HH:mm', { locale: ptBR })}
          </p>
        </div>
      )}
    </div>
  );
}
