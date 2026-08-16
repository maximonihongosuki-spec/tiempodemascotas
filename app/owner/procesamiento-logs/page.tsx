'use client';

import { useEffect, useState } from 'react';

type Log = {
  id: string;
  created_at: string;
  type: 'categorization' | 'webp' | 'seo';
  mode: 'native' | 'n8n';
  status: 'success' | 'error';
  duration_ms: number;
  stages: any[] | null;
  input_summary: any;
  output_summary: any;
  error_message: string | null;
  metadata: any;
};

export default function ProcesamientoLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, Set<number>>>({});

  const toggleStage = (logId: string, stageIdx: number) => {
    setExpandedStages(prev => {
      const current = new Set(prev[logId] || []);
      if (current.has(stageIdx)) current.delete(stageIdx);
      else current.add(stageIdx);
      return { ...prev, [logId]: current };
    });
  };

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');
      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, statusFilter]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('es-PY', { 
      timeZone: 'America/Asuncion',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Procesamiento</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auditoría de todas las llamadas a categorización IA, conversión WebP y optimización SEO.
            {total > 0 && ` ${total} entradas totales.`}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="categorization">Categorización IA</option>
              <option value="webp">Conversión WebP</option>
              <option value="seo">Optimización SEO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="success">Éxito</option>
              <option value="error">Error</option>
            </select>
          </div>
          <button 
            onClick={fetchLogs}
            className="mt-5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Refrescar
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Cargando…</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No hay logs todavía.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resumen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {log.type === 'categorization' ? 'Categ. IA' : log.type === 'seo' ? 'SEO IA' : 'WebP'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.mode === 'native' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {log.mode === 'native' ? 'Nativo' : 'n8n'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 'success' ? '✓ Éxito' : '✗ Error'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.duration_ms?.toLocaleString() || '—'}ms</td>
                      <td className="px-4 py-3 text-gray-600 max-w-md truncate">
                        {log.type === 'categorization' && log.input_summary?.product_count
                          ? `${log.input_summary.product_count} producto(s)`
                          : log.type === 'seo' && log.input_summary?.product_count
                          ? `SEO: ${log.input_summary.product_count} producto(s) (${log.input_summary.model || 'sin modelo'})`
                          : log.type === 'webp' && log.input_summary?.size_bytes
                          ? `Archivo ${(log.input_summary.size_bytes / 1024).toFixed(1)} KB`
                          : log.type === 'webp' && log.input_summary?.imageUrl
                          ? `URL: ${log.input_summary.imageUrl.slice(0, 60)}…`
                          : '—'}
                        {log.error_message && (
                          <div className="text-red-600 text-xs mt-1 truncate">{log.error_message}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          {expandedId === log.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-expanded`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-4">
                          <div className="space-y-4">
                            {log.stages && Array.isArray(log.stages) && log.stages.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase mb-2 tracking-wide">
                                  Pipeline — etapas
                                </p>
                                <div className="space-y-2">
                                  {log.stages.map((s: any, i: number) => {
                                    const isStageExpanded = expandedStages[log.id]?.has(i) ?? false;
                                    return (
                                      <div key={i} className={`rounded-lg border text-xs ${
                                        s.status === 'ok'
                                          ? 'bg-green-50/50 border-green-200'
                                          : 'bg-red-50/50 border-red-200'
                                      }`}>
                                        <div
                                          className="flex items-center gap-3 p-2.5 cursor-pointer select-none"
                                          onClick={() => toggleStage(log.id, i)}
                                        >
                                          <span className={s.status === 'ok' ? 'text-green-600' : 'text-red-600 font-bold'}>
                                            {s.status === 'ok' ? '✓' : '✗'}
                                          </span>
                                          <span className="font-medium text-gray-800 flex-1">{s.stage}</span>
                                          <span className="text-gray-400">{s.duration_ms}ms</span>
                                          {s.data && (
                                            <span className="text-blue-500 font-medium">
                                              {isStageExpanded ? '▲ cerrar' : '▼ ver datos'}
                                            </span>
                                          )}
                                        </div>
                                        {s.detail && (
                                          <p className="px-3 pb-2 text-gray-650 font-normal">{s.detail}</p>
                                        )}
                                        {isStageExpanded && s.data && (
                                          <div className="px-3 pb-3">
                                            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
                                              {JSON.stringify(s.data, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                             <div className="grid grid-cols-1 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase mb-2 tracking-wide">
                                  Input completo {log.type === 'categorization' 
                                    ? `(${log.input_summary?.product_count || 0} productos, ${log.input_summary?.marcas_count || 0} marcas)` 
                                    : log.type === 'seo'
                                    ? `(${log.input_summary?.product_count || 0} productos - Modelo: ${log.input_summary?.model || '—'})`
                                    : ''}
                                </p>
                                <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap break-words">
{JSON.stringify(log.input_summary, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase mb-2 tracking-wide">
                                  Output completo {log.type === 'categorization' 
                                    ? `(${log.output_summary?.result_count || 0} resultados)` 
                                    : log.type === 'seo'
                                    ? `(${log.output_summary?.generated_count || 0} optimizados)`
                                    : ''}
                                </p>
                                <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap break-words">
{JSON.stringify(log.output_summary?.full_output || log.output_summary, null, 2)}
                                </pre>
                              </div>
                            </div>
                            {log.metadata && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Metadata</p>
                                <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto">
{JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.error_message && (
                              <div>
                                <p className="text-xs font-semibold text-red-700 uppercase mb-2">Error completo</p>
                                <pre className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 whitespace-pre-wrap">
{log.error_message}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
