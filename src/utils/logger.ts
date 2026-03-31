import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'info' | 'warn' | 'error' | 'action';

export interface LogEntry {
  acao: string;
  nivel: LogLevel;
  tabela?: string;
  registro_id?: string;
  detalhes?: Record<string, unknown>;
  usuario_id?: string;
  clinica_id?: string;
}

class LoggerService {
  private queue: LogEntry[] = [];
  private isProcessing = false;
  private BATCH_SIZE = 10;
  private SYNC_INTERVAL = 5000;

  constructor() {
    // Attempt to flush logs periodically
    setInterval(() => this.flush(), this.SYNC_INTERVAL);
    
    // Attempt to flush before window closes
    window.addEventListener('beforeunload', () => this.flush(true));
  }

  private async getCurrentSessionInfo() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, clinica_id')
        .eq('auth_user_id', session.user.id)
        .single();
        
      return userData;
    } catch {
      return null;
    }
  }

  public async log(level: LogLevel, action: string, details?: Record<string, unknown>) {
    // 1. Console Output for Dev/Testing visibility
    const timestamp = new Date().toISOString();
    const path = window.location.pathname;
    
    const consoleStyles = {
      info: 'color: #3b82f6; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
      action: 'color: #10b981; font-weight: bold;'
    };

    console.log(`%c[${level.toUpperCase()}] ${action}`, consoleStyles[level], details || '');

    // 2. Queue for Database Insertion
    const sessionInfo = await this.getCurrentSessionInfo();
    
    // Note: Use 'any' type cast here or extract 'tabela'/'registro_id' safely
    const customDetails: any = details || {};
    
    const entry: LogEntry = {
      nivel: level,
      acao: action,
      tabela: customDetails?.tabela || undefined,
      registro_id: customDetails?.registro_id || undefined,
      detalhes: customDetails?.detalhes ? customDetails.detalhes : { ...customDetails, path, timestamp },
      usuario_id: customDetails?.usuario_id || sessionInfo?.id,
      clinica_id: customDetails?.clinica_id || sessionInfo?.clinica_id
    };

    this.queue.push(entry);

    if (this.queue.length >= this.BATCH_SIZE || level === 'error') {
      this.flush();
    }
  }

  public info(action: string, details?: Record<string, unknown>) { this.log('info', action, details); }
  public warn(action: string, details?: Record<string, unknown>) { this.log('warn', action, details); }
  public error(action: string, details?: Record<string, unknown>) { this.log('error', action, details); }
  public action(action: string, details?: Record<string, unknown>) { this.log('action', action, details); }

  private async flush(sync = false) {
    if (this.queue.length === 0 || this.isProcessing) return;
    
    // Grab current items and clear queue
    const itemsToSync = [...this.queue];
    this.queue = [];
    this.isProcessing = true;

    try {
      // In a real database, we would insert into 'system_logs'
      const { error } = await supabase.from('system_logs').insert(itemsToSync as any);
      if (error) {
        // If it fails (e.g., table missing), put them back in queue
        console.warn('Failed to sync logs to DB, restoring to queue...', error);
        this.queue = [...itemsToSync, ...this.queue];
      }
    } catch (e) {
      this.queue = [...itemsToSync, ...this.queue];
    } finally {
      this.isProcessing = false;
    }
  }
}

export const logger = new LoggerService();
