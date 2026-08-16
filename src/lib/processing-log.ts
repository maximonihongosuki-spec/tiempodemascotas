import { createClient } from '@supabase/supabase-js';

export type LogType = 'categorization' | 'webp' | 'seo';
export type LogMode = 'native' | 'n8n';
export type LogStatus = 'success' | 'error';

export type ProcessingLogEntry = {
  type: LogType;
  mode: LogMode;
  status: LogStatus;
  duration_ms: number;
  stages?: any[];
  input_summary?: any;
  output_summary?: any;
  error_message?: string;
  metadata?: any;
};

// Función fire-and-forget para logear sin bloquear la respuesta.
// Si Supabase falla, no rompe el flujo principal.
export async function logProcessing(entry: ProcessingLogEntry): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    await supabase.from('processing_logs').insert({
      type: entry.type,
      mode: entry.mode,
      status: entry.status,
      duration_ms: entry.duration_ms,
      stages: entry.stages || null,
      input_summary: entry.input_summary || null,
      output_summary: entry.output_summary || null,
      error_message: entry.error_message || null,
      metadata: entry.metadata || null,
    });
  } catch (err) {
    // No relanzamos: el log es secundario
    console.error('[processing-log] Failed to log:', err);
  }
}
