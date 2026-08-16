import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, Trash2 } from 'lucide-react';
import { supabase, CreditPayment, Sale } from '../../lib/supabase';
import { format } from 'date-fns';

type PaymentWithSale = CreditPayment & { sale: Sale; };

export default function CreditPaymentsManagement() {
  const [payments, setPayments] = useState<PaymentWithSale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithSale | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [paymentFormData, setPaymentFormData] = useState({ payment_method: 'cash', notes: '' });
  const [exchangeRate, setExchangeRate] = useState(7500);

  useEffect(() => { loadPayments(); fetchExchangeRate(); }, []);

  const fetchExchangeRate = async () => {
    const { data } = await supabase.from('site_settings').select('dollar_exchange_rate').single();
    if (data?.dollar_exchange_rate) setExchangeRate(data.dollar_exchange_rate);
  };

  const loadPayments = async () => {
    const { data: paymentsData } = await supabase.from('credit_payments').select('*').order('due_date', { ascending: true });
    if (paymentsData) {
      const paymentsWithSales = await Promise.all(paymentsData.map(async (payment) => {
          const { data: sale } = await supabase.from('sales').select('*').eq('id', payment.sale_id).single();
          return { ...payment, sale: sale! };
      }));
      setPayments(paymentsWithSales);
    }
  };

  const markAsPaid = async () => {
    if (!selectedPayment) return;
    const { error } = await supabase.from('credit_payments').update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method: paymentFormData.payment_method,
        notes: paymentFormData.notes
      }).eq('id', selectedPayment.id);
    if (!error) {
      setShowPaymentForm(false); setSelectedPayment(null); setPaymentFormData({ payment_method: 'cash', notes: '' }); loadPayments();
    } else { alert('Error al registrar el pago'); }
  };

  const updatePromissoryStatus = async (paymentId: string, status: 'pending' | 'delivered' | 'in_possession') => {
    await supabase.from('credit_payments').update({ promissory_note_status: status }).eq('id', paymentId);
    loadPayments();
  };

  const toggleSelectAll = () => {
    if (selectedPayments.size === filteredPayments.length) setSelectedPayments(new Set());
    else setSelectedPayments(new Set(filteredPayments.map(p => p.id)));
  };

  const deleteSelectedPayments = async () => {
    if (selectedPayments.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedPayments.size} pagos?`)) return;
    await supabase.from('credit_payments').delete().in('id', Array.from(selectedPayments));
    setSelectedPayments(new Set()); loadPayments();
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.sale?.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getTotalPending = () => payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
  const getTotalOverdue = () => payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="font-sans text-gray-900">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Créditos</h2>
        {selectedPayments.size > 0 && (
          <button onClick={deleteSelectedPayments} className="px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
            Eliminar ({selectedPayments.size})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Pendiente</p>
            <p className="text-xl font-bold text-blue-600">₲ {getTotalPending().toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">USD {(getTotalPending() / exchangeRate).toFixed(2)}</p>
          </div>
          <Clock className="text-blue-100 w-8 h-8" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Vencido</p>
            <p className="text-xl font-bold text-red-600">₲ {getTotalOverdue().toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">USD {(getTotalOverdue() / exchangeRate).toFixed(2)}</p>
          </div>
          <XCircle className="text-red-100 w-8 h-8" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Cobrado</p>
            <p className="text-xl font-bold text-green-600">₲ {payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">USD {(payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) / exchangeRate).toFixed(2)}</p>
          </div>
          <CheckCircle className="text-green-100 w-8 h-8" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'overdue', 'paid'].map(status => (
            <button key={status} onClick={() => setFilterStatus(status as any)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize border ${filterStatus === status ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>{status === 'all' ? 'Todos' : status}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cuota</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Monto</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><input type="checkbox" checked={selectedPayments.has(payment.id)} onChange={() => { const ns = new Set(selectedPayments); if(ns.has(payment.id)) ns.delete(payment.id); else ns.add(payment.id); setSelectedPayments(ns); }} className="rounded border-gray-300 text-blue-600" /></td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.sale?.customer_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(payment.due_date), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3 text-sm text-gray-600">#{payment.installment_number}</td>
                <td className="px-4 py-3">
                   <p className="text-sm font-bold text-gray-900">₲ {payment.amount.toLocaleString()}</p>
                   <p className="text-[10px] text-gray-500">USD {(payment.amount / exchangeRate).toFixed(2)}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : payment.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{payment.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {payment.status !== 'paid' && <button onClick={() => { setSelectedPayment(payment); setShowPaymentForm(true); }} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Pagar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No hay registros.</div>}
      </div>

      {showPaymentForm && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Registrar Pago</h3>
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
              <p><strong>Cliente:</strong> {selectedPayment.sale.customer_name}</p>
              <p><strong>Monto:</strong> ₲ {selectedPayment.amount.toLocaleString()} (USD {(selectedPayment.amount / exchangeRate).toFixed(2)})</p>
            </div>
            <div className="space-y-3">
              <select value={paymentFormData.payment_method} onChange={e => setPaymentFormData({...paymentFormData, payment_method: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm">
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>
              <textarea placeholder="Notas..." value={paymentFormData.notes} onChange={e => setPaymentFormData({...paymentFormData, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" rows={2}></textarea>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowPaymentForm(false)} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancelar</button>
              <button onClick={markAsPaid} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}