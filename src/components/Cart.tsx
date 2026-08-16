'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X, Plus, Minus, Trash2, ShoppingBag, ArrowLeft, ChevronRight,
  MapPin, Upload, CreditCard, Banknote, Smartphone, Truck, Store,
  AlertCircle, Check, Loader2, MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { supabaseAuth } from '../lib/supabase-auth';
import { buildOrderWhatsAppMessage, fetchItemsMetadata, type OrderForMessage } from '../lib/orderWhatsapp';
import { toTitleCase } from '../lib/textFormat';
import { getUnitPriceForQty, getValidVolumeLevels } from '../lib/volumePricing';
import { detectBoxPresentation } from '../lib/boxPresentation';
import { VolumePrice } from '../lib/supabase';

const DeliveryMap = dynamic(() => import('./DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm animate-pulse">
      Cargando mapa...
    </div>
  ),
});

type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'pos';
type DeliveryType = 'retiro' | 'delivery';
type CartStep = 'items' | 'customer' | 'payment' | 'delivery' | 'confirm' | 'success';

type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
  is_bulk?: boolean;
  requires_prescription?: boolean;
  retail_price?: number;   // precio minorista original (para mostrar tachado en mayorista)
  stock?: number;
  // Nuevos campos opcionales para volume pricing y presentación de caja
  volume_prices?: VolumePrice[];
  base_price?: number;       // precio base sin descuentos de volumen
  box_factor?: number | null; // unidades por caja (null = no tiene caja)
};

type DeliveryZone = { id: string; name: string; price: number };

type SiteConfig = {
  delivery_min_amount: number;
  free_delivery_min_amount: number | null;
  transfer_bank: string;
  transfer_account: string;
  transfer_holder: string;
};

type CartProps = {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  orderType?: string;     // 'retail' (default) | 'mayorista'
};

const STEP_LABELS: Record<CartStep, string> = {
  items: 'Carrito', customer: 'Tus datos', payment: 'Método de pago',
  delivery: 'Envío', confirm: 'Confirmar', success: '¡Listo!',
};
const STEPS: CartStep[] = ['items', 'customer', 'payment', 'delivery', 'confirm'];

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onClearCart, orderType = 'retail' }: CartProps) {
  const [step, setStep] = useState<CartStep>('items');
  const [waNumber, setWaNumber] = useState('');
  const [waEnabled, setWaEnabled] = useState(false);
  const [sentItems, setSentItems] = useState<CartItem[]>([]);
  const [sentTotal, setSentTotal] = useState<number>(0);
  const [waMessage, setWaMessage] = useState('');

  useEffect(() => {
    supabase.from('site_settings').select('whatsapp_number, whatsapp_enabled').single()
      .then(({ data }) => {
        if (data) {
          setWaNumber(data.whatsapp_number || '');
          setWaEnabled(!!data.whatsapp_enabled);
        }
      });
  }, []);

  useEffect(() => {
    if (step !== 'success' || sentItems.length === 0) return;
    (async () => {
      const itemsForMsg = sentItems.map(i => ({
        product_id: i.product_id, product_name: i.product_name, price: i.price, quantity: i.quantity,
      }));
      const meta = await fetchItemsMetadata(supabase, itemsForMsg);
      const orderForMsg: OrderForMessage = {
        tracking_code: trackingCode,
        customer_name: custName,
        customer_phone: custPhone,
        customer_document: custDocument,
        items: itemsForMsg,
        total: sentTotal,
        delivery_type: deliveryType,
        delivery_zone_name: selectedZone?.name || null,
        delivery_cost: deliveryType === 'delivery' ? zoneCost : null,
        delivery_lat: deliveryCoords?.lat ?? null,
        delivery_lng: deliveryCoords?.lng ?? null,
        delivery_maps_link: mapsLink || null,
        payment_method: paymentMethod,
        payment_hash: null, // el flujo de tarjeta nunca llega a este paso — redirige a Pagopar antes
        invoice_data: sentInvoiceData,
        payment_proof_url: sentProofUrl,
      };
      setWaMessage(buildOrderWhatsAppMessage(orderForMsg, meta));
    })();
  }, [step]);
  const [itemPrescriptionMap, setItemPrescriptionMap] = useState<Record<string, boolean>>({});
  const [showPrescriptionConfirm, setShowPrescriptionConfirm] = useState(false);
  const [prescriptionOption, setPrescriptionOption] = useState<'upload' | 'physical' | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [uploadingPrescription, setUploadingPrescription] = useState(false);

  const isPrescriptionItem = (item: CartItem): boolean => {
    if (item.requires_prescription !== undefined) return item.requires_prescription;
    return itemPrescriptionMap[item.product_id] || false;
  };

  // Customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custDocument, setCustDocument] = useState('');
  const [custDocType, setCustDocType] = useState<'ci' | 'ruc_personal' | 'ruc_sociedad'>('ci');
  const [notes, setNotes] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const customerTouchedRef = useRef(false);

  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceDoc, setInvoiceDoc] = useState('');
  const [invoiceDocType, setInvoiceDocType] = useState<'ci' | 'ruc'>('ci');
  const [invoiceAddress, setInvoiceAddress] = useState('');

  const [sentInvoiceData, setSentInvoiceData] = useState<any>(null);
  const [sentProofUrl, setSentProofUrl] = useState<string>('');

  // Payment & Delivery
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('retiro');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsLink, setMapsLink] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationOutOfRange, setLocationOutOfRange] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [deliveryPhase, setDeliveryPhase] = useState<'mark' | 'verify'>('mark');
  const [confirmCoords, setConfirmCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmGettingGPS, setConfirmGettingGPS] = useState(false);

  const distanceMeters = deliveryCoords && confirmCoords
    ? haversineMeters(deliveryCoords.lat, deliveryCoords.lng, confirmCoords.lat, confirmCoords.lng)
    : null;
  const locationsMatch = distanceMeters !== null && distanceMeters <= 50;

  // Proof upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Config
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [config, setConfig] = useState<SiteConfig>({
    delivery_min_amount: 100000, free_delivery_min_amount: null,
    transfer_bank: '', transfer_account: '', transfer_holder: '',
  });

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [waNotifying, setWaNotifying] = useState(false);
  const [waNotified, setWaNotified] = useState(false);
  const [purchaseModes, setPurchaseModes] = useState<Record<string, 'units' | 'boxes'>>({});

  // Calcula el precio unitario efectivo considerando volumen
  const getEffectiveUnitPrice = (item: CartItem): number => {
    if (!item.volume_prices || item.volume_prices.length === 0) return item.price;
    return getUnitPriceForQty(item.volume_prices, item.quantity, item.base_price || item.price);
  };

  const getEstimatedDeliveryMessage = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Si confirmás tu pedido antes del mediodía, te llega HOY de 14:00 a 18:00 hs.';
    }
    return 'Los pedidos confirmados después del mediodía llegan MAÑANA de 9:00 a 12:00 hs.';
  };

  // Precio efectivo total de un item
  const getItemTotal = (item: CartItem): number => {
    const mode = purchaseModes[item.product_id] || 'units';
    if (mode === 'boxes' && item.box_factor) {
      // En modo cajas: buscar el precio de la caja en volume_prices
      const boxVP = (item.volume_prices || []).find(v => v.price > (item.base_price || item.price));
      if (boxVP) return item.quantity * boxVP.price;
    }
    return item.quantity * getEffectiveUnitPrice(item);
  };

  // Derived
  const subtotal = items.reduce((s, i) => s + getItemTotal(i), 0);
  const hasBulkItems = items.some(i => i.is_bulk);
  const bulkNames = items.filter(i => i.is_bulk).map(i => i.product_name);
  const canDelivery = !hasBulkItems && subtotal >= config.delivery_min_amount;
  const freeDelivery = config.free_delivery_min_amount !== null && subtotal >= config.free_delivery_min_amount;
  const zoneCost = (deliveryType === 'delivery' && selectedZone) ? (freeDelivery ? 0 : selectedZone.price) : 0;
  const grandTotal = subtotal + zoneCost;

  useEffect(() => {
    checkLoggedIn();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadConfig();
    loadZones();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep('items'); setPaymentMethod(null); setDeliveryType('retiro');
      setSelectedZone(null); setDeliveryCoords(null); setMapsLink('');
      setProofFile(null); setProofUrl('');
      setIsLoggedIn(false);
      setAddressQuery('');
      setGeocoding(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (addressQuery.trim().length < 6) return;
    const timer = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(addressQuery.trim() + ', Paraguay')}`);
        const data = await res.json();
        if (data.results?.[0]) {
          setDeliveryCoords({ lat: data.results[0].lat, lng: data.results[0].lon });
        }
      } catch {
        // Si falla el geocoding, el cliente igual puede marcar el pin a mano
      } finally {
        setGeocoding(false);
      }
    }, 900); // debounce: esperamos a que deje de tipear
    return () => clearTimeout(timer);
  }, [addressQuery]);

  useEffect(() => {
    if (!deliveryCoords) { setResolvedAddress(null); setLocationConfirmed(false); return; }

    const { lat, lng } = deliveryCoords;
    const inRange = lat >= -25.45 && lat <= -25.15 && lng >= -57.75 && lng <= -57.50;
    setLocationOutOfRange(!inRange);
    setLocationConfirmed(false); // cualquier cambio de pin exige reconfirmar

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        setResolvedAddress(data.address || null);
      } catch {
        setResolvedAddress(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [deliveryCoords]);

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    
    // Detectar items que no traen el flag de receta
    const missingFlag = items.filter(i => i.requires_prescription === undefined);
    if (missingFlag.length === 0) return;
    
    const ids = missingFlag.map(i => i.product_id);
    supabase
      .from('products')
      .select('id, requires_prescription')
      .in('id', ids)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const hydrated: Record<string, boolean> = {};
        data.forEach(p => { hydrated[p.id] = p.requires_prescription || false; });
        setItemPrescriptionMap(prev => ({ ...prev, ...hydrated }));
      });
  }, [isOpen, items]);

  const loadConfig = async () => {
    const { data } = await supabase.from('site_settings')
      .select('delivery_min_amount, free_delivery_min_amount, transfer_bank, transfer_account, transfer_holder')
      .single();
    if (data) setConfig({
      delivery_min_amount: data.delivery_min_amount || 100000,
      free_delivery_min_amount: data.free_delivery_min_amount ?? null,
      transfer_bank: data.transfer_bank || '',
      transfer_account: data.transfer_account || '',
      transfer_holder: data.transfer_holder || '',
    });
  };

  const loadZones = async () => {
    const { data } = await supabase.from('delivery_zones')
      .select('id, name, price').eq('is_active', true).order('order_index');
    if (data) setZones(data);
  };

  const checkLoggedIn = async () => {
    try {
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user) { setIsLoggedIn(false); return; }
      const { data } = await supabaseAuth
        .from('user_profiles')
        .select('full_name, phone, email, document, document_type, active')
        .eq('id', user.id)
        .single();
      if (data && data.active) {
        setIsLoggedIn(true);
        if (!customerTouchedRef.current) {
          setCustName(data.full_name || '');
          setCustPhone(data.phone || '');
          setCustEmail(data.email || '');
          setCustDocument(data.document || '');
          setCustDocType((data.document_type as any) || 'ci');
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    }
  };

  const uploadProof = async (file: File): Promise<string> => {
    let blob: Blob | null = null;
    try {
      const res = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (res.ok) blob = await res.blob();
    } catch (e) {
      console.error('Error al optimizar comprobante:', e);
    }

    const filename = blob
      ? `proof_${Date.now()}.webp`
      : `proof_${Date.now()}.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
    const fileToUpload = blob ?? file;
    const contentType = blob ? 'image/webp' : file.type;

    const { error } = await supabase.storage
      .from('payment-proofs')
      .upload(filename, fileToUpload, { contentType, upsert: false, cacheControl: '31536000' });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filename);
    return publicUrl;
  };

  const handleProofUpload = async (file: File) => {
    setUploadingProof(true);
    try { setProofUrl(await uploadProof(file)); setProofFile(file); }
    catch { alert('Error al subir el comprobante. Intentá de nuevo.'); }
    setUploadingProof(false);
  };

  const uploadPrescription = async (file: File): Promise<string> => {
    let blob: Blob | null = null;
    try {
      const res = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (res.ok) blob = await res.blob();
    } catch (e) {
      console.error('Error al optimizar receta:', e);
    }

    const filename = blob
      ? `receta_${Date.now()}.webp`
      : `receta_${Date.now()}.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
    const fileToUpload = blob ?? file;
    const contentType = blob ? 'image/webp' : file.type;

    const { error } = await supabase.storage
      .from('prescriptions')
      .upload(filename, fileToUpload, { contentType, upsert: false, cacheControl: '31536000' });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(filename);
    return publicUrl;
  };

  const handlePrescriptionUpload = async (file: File) => {
    setUploadingPrescription(true);
    try {
      setPrescriptionUrl(await uploadPrescription(file));
      setPrescriptionFile(file);
      setPrescriptionOption('upload');
    } catch {
      alert('Error al subir la receta. Intentá de nuevo.');
    }
    setUploadingPrescription(false);
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    // Efectivo fuerza retiro — delivery inhabilitado
    if (method === 'efectivo') {
      setDeliveryType('retiro');
      setSelectedZone(null);
      setDeliveryCoords(null);
    }
    // POS ya NO fuerza delivery — el usuario elige
  };

  const proceedFromPayment = () => {
    if (!paymentMethod) { alert('Seleccioná un método de pago'); return; }
    setStep('delivery'); // Siempre va al paso delivery — allí se controlan las restricciones
  };

  const proceedFromDelivery = () => {
    if (deliveryType === 'delivery' && !selectedZone) {
      alert('Seleccioná una zona de entrega');
      return;
    }
    setStep('confirm');
  };

  const canConfirm = () => {
    if (!custName.trim() || !custPhone.trim() || !custDocument.trim() || !custEmail.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(custEmail.trim())) return false;
    if (deliveryType === 'delivery' && !selectedZone) return false;
    if (paymentMethod === 'transferencia' && !proofUrl) return false;
    return true;
  };

  const handleWhatsAppNotify = () => {
    const waLink = `https://wa.me/${waNumber.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`;
    // Abrir WhatsApp INMEDIATAMENTE (sincrónico, dentro del gesto de click)
    // para que los navegadores no bloqueen el popup.
    window.open(waLink, '_blank', 'noopener,noreferrer');

    setWaNotifying(true);
    const markNotified = async (attempt = 1): Promise<void> => {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ whatsapp_notified_at: new Date().toISOString() })
          .eq('tracking_code', trackingCode);
        if (error) throw error;
        setWaNotified(true);
      } catch (e) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 800 * attempt));
          return markNotified(attempt + 1);
        }
        console.error('[WhatsApp] No se pudo marcar el pedido como avisado tras 3 intentos:', e);
      } finally {
        setWaNotifying(false);
      }
    };
    markNotified();
  };

  const handleSubmitOrder = async () => {
    const hasPrescriptionItems = items.some(i => 
      (isPrescriptionItem ? isPrescriptionItem(i) : i.requires_prescription) === true
    );
    if (hasPrescriptionItems && !(prescriptionUrl || prescriptionOption === 'physical')) {
      setShowPrescriptionConfirm(true);
      return;  // detiene el flujo hasta que se acepte el modal
    }

    if (isSubmitting || !canConfirm()) return;
    setIsSubmitting(true);
    try {
      // Detectar si hay un usuario de miembros logueado
      let loggedUserId: string | null = null;
      try {
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (user?.id) loggedUserId = user.id;
      } catch {
        // No hay sesión activa — continuar sin user_id
      }

      const invoiceData = wantsInvoice && invoiceName.trim() ? {
        razon_social: invoiceName.trim(),
        documento: invoiceDoc.trim(),
        documento_tipo: invoiceDocType,
        direccion: invoiceAddress.trim() || null,
      } : null;

      const basePayload: any = {
        customer_name: custName.trim(), customer_phone: custPhone.trim(),
        customer_email: custEmail.trim(), customer_document: custDocument.trim(),
        notes: notes.trim(),
        items: items.map(i => ({ ...i })),
        total: grandTotal, order_type: orderType || 'retail',
        delivery_type: deliveryType,
        user_id: loggedUserId,
        invoice_data: invoiceData,
      };
      if (prescriptionUrl) basePayload.prescription_url = prescriptionUrl;
      basePayload.prescription_physical = prescriptionOption === 'physical';
      if (deliveryType === 'delivery' && selectedZone) {
        basePayload.delivery_zone_name = selectedZone.name;
        basePayload.delivery_cost = zoneCost;
        if (deliveryCoords) { basePayload.delivery_lat = deliveryCoords.lat; basePayload.delivery_lng = deliveryCoords.lng; }
        if (mapsLink.trim()) { basePayload.delivery_maps_link = mapsLink.trim(); }
      }

      // ── Tarjeta / débito: pasa por Pagopar. El pedido recién queda confirmado
      // cuando llega la confirmación de pago (webhook), NO acá. ──
      if (paymentMethod === 'tarjeta') {
        setSentInvoiceData(invoiceData);
        setSentProofUrl(proofUrl || '');
        const res = await fetch('/api/pagopar/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        });
        const data = await res.json();
        if (!res.ok || !data.redirectUrl) {
          throw new Error(data.error || 'No se pudo iniciar el pago con Pagopar');
        }
        window.location.href = data.redirectUrl;
        return; // Salimos hacia Pagopar — no seguir ejecutando nada más acá
      }

      // ── Resto de los métodos (efectivo, transferencia, POS): ahora vía
      // endpoint server-side, que recalcula precios — no insertar directo. ──
      const payload: any = {
        ...basePayload,
        payment_method: paymentMethod,
      };
      if (proofUrl) payload.payment_proof_url = proofUrl;

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el pedido');
      const code = data.trackingCode;
      setTrackingCode(code);
      setPrescriptionOption(null);
      setPrescriptionFile(null);
      setPrescriptionUrl('');
      setUploadingPrescription(false);
      setSentItems(items);
      setSentTotal(grandTotal);
      setSentInvoiceData(invoiceData);
      setSentProofUrl(proofUrl || '');
      setStep('success');
      onClearCart();
    } catch (err: any) {
      alert(err?.message || 'Error al enviar el pedido. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx <= 0) return;
    setStep(STEPS[idx - 1]);
  };

  if (!isOpen) return null;

  // ── SUCCESS ──────────────────────────────────────────────
  if (step === 'success') return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto bg-white w-full md:w-[460px] h-full flex flex-col shadow-2xl items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-[#eeee22] rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-[#166534]" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-display font-black text-[#166534] uppercase mb-2">¡Pedido enviado!</h2>
        <p className="text-gray-500 mb-4">Tu pedido fue recibido correctamente.</p>
        <div className="bg-gray-50 rounded-2xl px-6 py-4 mb-6 w-full">
          <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Código de seguimiento</p>
          <p className="text-2xl font-mono font-black text-[#166534] tracking-widest">{trackingCode}</p>
        </div>
        {waEnabled && waNumber && (
          <button
            onClick={handleWhatsAppNotify}
            disabled={waNotifying}
            className="w-full py-3 bg-[#25D366] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#20BA5A] transition-colors mb-3 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {waNotified ? (
              <><Check className="w-4 h-4" /> Avisado por WhatsApp</>
            ) : (
              <><MessageCircle className="w-4 h-4" /> {waNotifying ? 'Marcando...' : 'Avisar por WhatsApp'}</>
            )}
          </button>
        )}
        <a href={`/seguimiento/${trackingCode}`}
          className="w-full py-3 bg-[#166534] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors mb-3 block text-center">
          Ver seguimiento
        </a>
        <button onClick={onClose}
          className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-2xl font-display font-bold text-sm hover:bg-gray-50 transition-colors">
          Seguir comprando
        </button>
      </div>
    </div>
  );

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto bg-white w-full md:w-[460px] h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#166534] flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'items' && (
              <button onClick={handleBack} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {step === 'items' && <ShoppingBag className="w-5 h-5 text-[#eeee22]" />}
            <h2 className="text-base font-display font-black text-white uppercase">{STEP_LABELS[step]}</h2>
            {orderType === 'mayorista' && (
              <span className="ml-2 text-[9px] bg-[#eeee22] text-[#166534] px-2 py-0.5 rounded-full font-black uppercase">
                Veterinario
              </span>
            )}
            {step === 'items' && items.length > 0 && (
              <span className="bg-[#eeee22] text-[#166534] text-xs font-black px-2 py-0.5 rounded-full">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        {step !== 'items' && (
          <div className="flex gap-1 px-5 py-2 bg-[#064E3B] flex-shrink-0">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? 'bg-[#eeee22]' : 'bg-white/20'}`} />
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: ITEMS ── */}
          {step === 'items' && (
            <>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
                  <p className="font-display font-black text-gray-400 uppercase text-sm">Tu carrito está vacío</p>
                  <button onClick={onClose}
                    className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-[#166534] text-white rounded-full font-display font-bold text-sm hover:bg-[#064E3B] transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Seguir comprando
                  </button>
                </div>
              ) : (
                <>
                  {(() => {
                    const prescriptionItems = items.filter(i => 
                      isPrescriptionItem ? isPrescriptionItem(i) : i.requires_prescription
                    );
                    if (prescriptionItems.length === 0) return null;
                    return (
                      <div className="mx-5 mt-4 p-3 bg-gradient-to-r from-red-50 via-red-100 to-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 animate-slide-down relative overflow-hidden shadow-md">
                        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                        <div className="text-red-500 text-2xl animate-wiggle relative z-10">🩺</div>
                        <div className="flex-1 min-w-0 relative z-10">
                          <p className="text-xs font-black text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            ⚠️ Atención: Producto controlado
                          </p>
                          <p className="text-[11px] text-red-700 leading-relaxed">
                            {prescriptionItems.length === 1 ? (
                              <>
                                <strong>{toTitleCase(prescriptionItems[0].product_name)}</strong> requiere presentar 
                                receta veterinaria al retirar el pedido (medicamento controlado).
                              </>
                            ) : (
                              <>
                                Los siguientes productos requieren receta veterinaria al retirar:{' '}
                                <strong>{prescriptionItems.map(p => toTitleCase(p.product_name)).join(', ')}</strong>.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="px-5 py-4 space-y-3">
                    {items.map(item => {
                      const mode = purchaseModes[item.product_id] || 'units';
                      return (
                        <div key={item.product_id} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
                          {item.image_url && (
                            <div className="w-14 h-14 flex-shrink-0 bg-white rounded-xl overflow-hidden">
                              <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain p-1" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">
                              {toTitleCase(item.product_name)}
                              {item.is_bulk && (
                                <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black align-middle">
                                  A GRANEL
                                </span>
                              )}
                              {isPrescriptionItem(item) && (
                                <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black align-middle">
                                  RECETA
                                </span>
                              )}
                            </p>

                            {/* Lógica de presentación de caja y volumen */}
                            {(() => {
                              const boxInfo = (item.box_factor && item.volume_prices
                                ? detectBoxPresentation(item.volume_prices, item.base_price || item.price)
                                : { hasBox: false }) as any;
                              const effectiveUnitPrice = getEffectiveUnitPrice(item);
                              const hasVolDiscount = effectiveUnitPrice < (item.base_price || item.price);

                              return (
                                <div className="flex flex-col gap-1 flex-1 min-w-0 mt-1">
                                  {/* Toggle unidades/cajas */}
                                  {boxInfo.hasBox && (
                                    <div className="flex gap-1 mb-1">
                                      {(['units', 'boxes'] as const).map(m => (
                                        <button
                                          key={m}
                                          onClick={() => setPurchaseModes(prev => ({ ...prev, [item.product_id]: m }))}
                                          className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                                            mode === m
                                              ? 'bg-[#1A8A00] text-white border-[#1A8A00]'
                                              : 'bg-white text-gray-500 border-gray-300 hover:border-[#1A8A00]'
                                          }`}
                                        >
                                          {m === 'units' ? 'Unidades' : `Cajas (×${boxInfo.unitsPerBox})`}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Precio con descuento por volumen */}
                                  <div className="flex items-baseline gap-1.5">
                                    {hasVolDiscount && mode === 'units' && (
                                      <span className="text-xs text-gray-400 line-through">
                                        Gs. {Number(item.base_price || item.price).toLocaleString('es-PY')}
                                      </span>
                                    )}
                                    <span className={`text-sm font-bold ${hasVolDiscount ? 'text-[#1A8A00]' : 'text-gray-900'}`}>
                                      {mode === 'boxes' && boxInfo.hasBox
                                        ? `Gs. ${Number(boxInfo.boxPrice).toLocaleString('es-PY')} c/caja`
                                        : `Gs. ${Number(effectiveUnitPrice).toLocaleString('es-PY')} c/u`
                                      }
                                    </span>
                                    {hasVolDiscount && mode === 'units' && (
                                      <span className="text-[10px] text-[#1A8A00] font-semibold bg-green-50 px-1 rounded">
                                        ¡Precio por cantidad!
                                      </span>
                                    )}
                                  </div>

                                  {/* Hint próximo tier */}
                                  {mode === 'units' && !boxInfo.hasBox && (() => {
                                    const validLevels = getValidVolumeLevels(item.volume_prices || [], item.base_price || item.price);
                                    const nextTier = validLevels.find(v => v.min_qty > item.quantity);
                                    if (!nextTier) return null;
                                    const needed = nextTier.min_qty - item.quantity;
                                    return (
                                      <p className="text-[10px] text-orange-500 font-medium">
                                        Comprá {needed} más → Gs. {Number(nextTier.price).toLocaleString('es-PY')} c/u
                                      </p>
                                    );
                                  })()}

                                  {/* Hint caja disponible */}
                                  {mode === 'units' && boxInfo.hasBox && (
                                    <p className="text-[10px] text-orange-500 font-medium">
                                      💡 También disponible en caja de {boxInfo.unitsPerBox} unidades
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Total de este item */}
                            <p className="text-sm font-black text-[#166534] mt-1">
                              Total: Gs. {getItemTotal(item).toLocaleString('es-PY')}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => {
                                  if (mode === 'boxes') {
                                    onUpdateQuantity(item.product_id, Math.max(0, item.quantity - (item.box_factor || 1)));
                                  } else {
                                    onUpdateQuantity(item.product_id, item.quantity - 1);
                                  }
                                }}
                                className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-[#166534] hover:text-white hover:border-[#166534] transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-black text-xs">
                                {mode === 'boxes' && item.box_factor ? item.quantity / item.box_factor : item.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  const maxStock = typeof item.stock === 'number' ? item.stock : Infinity;
                                  const increment = mode === 'boxes' ? (item.box_factor || 1) : 1;
                                  if (item.quantity + increment > maxStock) {
                                    alert(`Solo hay ${maxStock} unidad(es) en stock de "${item.product_name}".`);
                                    return;
                                  }
                                  onUpdateQuantity(item.product_id, item.quantity + increment);
                                }}
                                disabled={typeof item.stock === 'number' && item.quantity + (mode === 'boxes' ? (item.box_factor || 1) : 1) > item.stock}
                                className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-[#166534] hover:text-white hover:border-[#166534] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-400 disabled:hover:border-gray-200"
                                title={typeof item.stock === 'number' && item.quantity >= item.stock ? `Stock máximo: ${item.stock}` : 'Agregar más'}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button onClick={() => onRemoveItem(item.product_id)}
                                className="ml-auto text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {items.length > 0 && (
                <div className="sticky bottom-0 border-t border-gray-100 px-5 py-4 bg-white space-y-3">
                  {hasBulkItems && (
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <p className="text-xs text-orange-700">
                        <span className="font-black">Sin delivery:</span> {bulkNames.join(', ')} no puede{bulkNames.length > 1 ? 'n' : ''} enviarse por ser a granel.
                      </p>
                    </div>
                  )}
                  {config.free_delivery_min_amount !== null && subtotal < config.free_delivery_min_amount && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-2 animate-slide-down">
                      <p className="text-xs text-[#166534] font-bold text-center flex items-center justify-center gap-1.5">
                        <span className="animate-bounce-x">💚</span>
                        Faltan Gs. {(config.free_delivery_min_amount - subtotal).toLocaleString('es-PY')} para delivery gratis
                      </p>
                    </div>
                  )}

                  {/* Ahorro por cantidad */}
                  {(() => {
                    const savings = items.reduce((acc, item) => {
                      const baseTotal = (item.base_price || item.price) * item.quantity;
                      const effectiveTotal = getItemTotal(item);
                      return acc + Math.max(0, baseTotal - effectiveTotal);
                    }, 0);
                    if (savings <= 0) return null;
                    return (
                      <div className="flex justify-between items-center text-xs text-[#1A8A00] font-semibold bg-green-50 rounded-lg px-3 py-2">
                        <span>Ahorro por cantidad</span>
                        <span>-Gs. {savings.toLocaleString('es-PY')}</span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Total:</span>
                    <span className="text-2xl font-display font-black text-[#166534]">
                      Gs. {subtotal.toLocaleString('es-PY')}
                    </span>
                  </div>
                  <button onClick={() => setStep('customer')}
                    className="w-full py-3.5 bg-[#166534] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-all shadow-lg flex items-center justify-center gap-2">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── STEP: CUSTOMER ── */}
          {step === 'customer' && (
            <div className="px-5 py-4 space-y-4">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span><span className="font-black">Datos autocargados</span> desde tu cuenta. Podés editarlos si querés.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-800">
                  <span className="text-base">💡</span>
                  <span>¿Ya tenés cuenta? <a href="/miembros/login" className="font-black underline">Iniciá sesión</a> para autocompletar tus datos.</span>
                </div>
              )}

              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Tus datos de contacto</p>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Tipo de documento</label>
                <select value={custDocType} onChange={e => { setCustDocType(e.target.value as any); }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#166534] outline-none">
                  <option value="ci">Cédula de Identidad (CI)</option>
                  <option value="ruc_personal">RUC Personal / Unipersonal</option>
                  <option value="ruc_sociedad">RUC Sociedad / Empresa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  {custDocType === 'ci' ? 'Número de CI *' : 'RUC (con dígito verificador) *'}
                </label>
                <input
                  type="text"
                  value={custDocument}
                  onChange={e => { customerTouchedRef.current = true; setCustDocument(e.target.value); }}
                  placeholder={custDocType === 'ci' ? 'Ej: 3230069' : 'Ej: 3230069-5'}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#166534] outline-none"
                />
              </div>

              {[
                { label: 'Nombre completo *', value: custName, setter: setCustName, type: 'text', placeholder: 'Juan Pérez' },
                { label: 'Teléfono / WhatsApp *', value: custPhone, setter: setCustPhone, type: 'tel', placeholder: '0981 234 567' },
                { label: 'Email *', value: custEmail, setter: setCustEmail, type: 'email', placeholder: 'tu@email.com' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => { customerTouchedRef.current = true; f.setter(e.target.value); }}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#166534] outline-none" />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notas del pedido</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Instrucciones especiales, referencias del lugar..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#166534] outline-none resize-none" />
              </div>

              <div className="border-2 border-gray-100 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWantsInvoice(v => !v)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧾</span>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#166534]">¿Necesitás factura a otro nombre?</p>
                      <p className="text-[10px] text-gray-500">Opcional — si no completás, la factura va a tu nombre</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold transition-transform ${wantsInvoice ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {wantsInvoice && (
                  <div className="p-4 space-y-3 bg-white border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Razón social / Nombre en la factura</label>
                      <input type="text" value={invoiceName} onChange={e => setInvoiceName(e.target.value)}
                        placeholder="A nombre de..."
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none" />
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                        <select value={invoiceDocType} onChange={e => setInvoiceDocType(e.target.value as any)}
                          className="w-full px-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none bg-white">
                          <option value="ci">CI</option>
                          <option value="ruc">RUC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Número</label>
                        <input type="text" value={invoiceDoc} onChange={e => setInvoiceDoc(e.target.value)}
                          placeholder="Ej: 3230069 o 80012345-6"
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Dirección (opcional)</label>
                      <input type="text" value={invoiceAddress} onChange={e => setInvoiceAddress(e.target.value)}
                        placeholder="Dirección para la factura"
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => {
                if (!custName.trim()) { alert('Ingresá tu nombre'); return; }
                if (!custPhone.trim()) { alert('Ingresá tu teléfono'); return; }
                if (!custDocument.trim()) { alert(custDocType === 'ci' ? 'Ingresá tu número de CI' : 'Ingresá tu RUC'); return; }
                if (!custEmail.trim()) { alert('Ingresá tu email'); return; }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(custEmail.trim())) { alert('Ingresá un email válido'); return; }
                setStep('payment');
              }} className="w-full py-3.5 bg-[#166534] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors flex items-center justify-center gap-2 shadow-lg">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP: PAYMENT ── */}
          {step === 'payment' && (
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">¿Cómo vas a pagar?</p>

              {([
                {
                  id: 'efectivo' as PaymentMethod,
                  icon: Banknote,
                  label: 'Efectivo',
                  desc: 'Pagás al retirar en el local',
                  note: 'Solo disponible con retiro',
                  color: 'text-green-600', bg: 'bg-green-50',
                },
                {
                  id: 'transferencia' as PaymentMethod,
                  icon: Smartphone,
                  label: 'Transferencia bancaria',
                  desc: 'Transferís y subís el comprobante',
                  note: 'Requiere confirmación manual',
                  color: 'text-blue-600', bg: 'bg-blue-50',
                },
                {
                  id: 'tarjeta' as PaymentMethod,
                  icon: CreditCard,
                  label: 'Tarjeta de crédito / débito',
                  desc: 'Pago seguro en la web',
                  note: '',
                  color: 'text-purple-600', bg: 'bg-purple-50',
                },
                {
                  id: 'pos' as PaymentMethod,
                  icon: Truck,
                  label: 'POS',
                  desc: 'Pago con posnet o QR en el momento',
                  note: 'Disponible para retiro y delivery',
                  color: 'text-orange-600', bg: 'bg-orange-50',
                },
              ] as const).map(opt => (
                <button key={opt.id} onClick={() => handlePaymentSelect(opt.id as PaymentMethod)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${paymentMethod === opt.id ? 'border-[#166534] bg-[#166534]/5' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${opt.bg} flex items-center justify-center flex-shrink-0`}>
                      <opt.icon className={`w-5 h-5 ${opt.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-black text-gray-900 text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{opt.note}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${paymentMethod === opt.id ? 'border-[#166534] bg-[#166534]' : 'border-gray-300'}`}>
                      {paymentMethod === opt.id && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              ))}

              <button onClick={proceedFromPayment} disabled={!paymentMethod}
                className="w-full py-3.5 bg-[#166534] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP: DELIVERY ── */}
          {step === 'delivery' && (
            <div className="px-5 py-4 space-y-4">

              {/* Selector retiro / delivery */}
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">¿Cómo recibís tu pedido?</p>

              {paymentMethod === 'efectivo' && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <Banknote className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-xs text-yellow-800 font-bold">
                    Con pago en efectivo solo podés retirar en el local.
                  </p>
                </div>
              )}

              {!canDelivery && !hasBulkItems && paymentMethod !== 'efectivo' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <span className="font-black">El monto mínimo para delivery es de Gs. {config.delivery_min_amount.toLocaleString('es-PY')}.</span>
                    {' '}Tu compra actual es de Gs. {subtotal.toLocaleString('es-PY')} — con retiro en el local no hay mínimo.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setDeliveryType('retiro'); setSelectedZone(null); setDeliveryCoords(null); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    deliveryType === 'retiro' ? 'border-[#166534] bg-[#166534]/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <Store className={`w-6 h-6 mb-2 ${deliveryType === 'retiro' ? 'text-[#166534]' : 'text-gray-400'}`} />
                  <p className="font-display font-black text-sm text-gray-900">Retiro en el local</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sin costo</p>
                </button>

                <button
                  onClick={() => (canDelivery && paymentMethod !== 'efectivo') && setDeliveryType('delivery')}
                  disabled={!canDelivery || paymentMethod === 'efectivo'}
                  title={
                    paymentMethod === 'efectivo' ? 'No disponible con efectivo' :
                    hasBulkItems ? `Sin delivery: ${bulkNames.join(', ')} son a granel` :
                    subtotal < config.delivery_min_amount ? `Mínimo Gs. ${config.delivery_min_amount.toLocaleString('es-PY')}` : ''
                  }
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    (!canDelivery || paymentMethod === 'efectivo')
                      ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                      : deliveryType === 'delivery'
                        ? 'border-[#166534] bg-[#166534]/5'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Truck className={`w-6 h-6 mb-2 ${deliveryType === 'delivery' ? 'text-[#166534]' : 'text-gray-400'}`} />
                  <p className="font-display font-black text-sm text-gray-900">Delivery</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {paymentMethod === 'efectivo' ? 'No disponible con efectivo' :
                     !canDelivery
                       ? hasBulkItems ? 'No disponible (granel)' : `Mín. Gs. ${config.delivery_min_amount.toLocaleString('es-PY')}`
                       : freeDelivery ? '¡Gratis!' : 'Ver zonas'}
                  </p>
                </button>
              </div>

              {hasBulkItems && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-orange-700">
                    <span className="font-black">Sin delivery:</span> {bulkNames.join(', ')} no puede{bulkNames.length > 1 ? 'n' : ''} enviarse por ser a granel.
                  </p>
                </div>
              )}

              {/* Zone + Map — solo si delivery */}
              {deliveryType === 'delivery' && deliveryPhase === 'mark' && (
                <>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Zona de entrega</p>
                    {freeDelivery && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-bold text-green-800">¡Delivery gratis en todas las zonas!</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {zones.map(zone => (
                        <button key={zone.id} onClick={() => setSelectedZone(zone)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${selectedZone?.id === zone.id ? 'border-[#166534] bg-[#166534]/5' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${selectedZone?.id === zone.id ? 'text-[#166534]' : 'text-gray-400'}`} />
                            <span className="font-bold text-sm text-gray-900">{zone.name}</span>
                          </div>
                          <span className={`text-sm font-black ${selectedZone?.id === zone.id ? 'text-[#166534]' : 'text-gray-600'}`}>
                            {freeDelivery ? (
                              <><span className="line-through text-gray-400 text-xs mr-1">Gs. {zone.price.toLocaleString('es-PY')}</span>¡Gratis!</>
                            ) : `Gs. ${zone.price.toLocaleString('es-PY')}`}
                          </span>
                        </button>
                      ))}
                      {zones.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No hay zonas configuradas.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Escribí tu dirección</p>
                    <div className="relative">
                      <input
                        type="text"
                        value={addressQuery}
                        onChange={e => setAddressQuery(e.target.value)}
                        placeholder="Ej: Av. Mariscal López 1234, Asunción"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#166534] outline-none"
                      />
                      {geocoding && (
                        <Loader2 className="w-4 h-4 text-[#166534] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">El mapa se centra solo — después podés ajustar el pin a mano si hace falta.</p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Ubicá tu dirección en el mapa</p>
                    <p className="text-xs text-gray-500 mb-3">Tocá el mapa para marcar el punto exacto de entrega.</p>
                    <DeliveryMap
                      lat={deliveryCoords?.lat ?? null}
                      lng={deliveryCoords?.lng ?? null}
                      onLocationSelect={(lat, lng) => setDeliveryCoords({ lat, lng })}
                    />
                    {deliveryCoords && (
                      <p className="text-xs text-[#166534] font-bold mt-2 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ubicación marcada correctamente
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
                      setGettingGPS(true);
                      navigator.geolocation.getCurrentPosition(
                        pos => { setDeliveryCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingGPS(false); },
                        (err) => {
                          setGettingGPS(false);
                          const msg = err.code === 1
                            ? 'Bloqueaste el permiso de ubicación en tu navegador. Activalo en la configuración del sitio, o marcá el pin manualmente.'
                            : err.code === 3
                            ? 'La ubicación tardó demasiado en responder. Intentá de nuevo o marcá el pin manualmente.'
                            : 'No pudimos obtener tu ubicación. Marcá el pin manualmente.';
                          alert(msg);
                        },
                        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                      );
                    }}
                    disabled={gettingGPS}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {gettingGPS ? <><Loader2 className="w-4 h-4 animate-spin" /> Obteniendo ubicación...</> : <>📍 Usar mi ubicación actual</>}
                  </button>

                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                      ¿Prefiere pegar el link de tu ubicación en vez de marcarla en el mapa?
                    </p>
                    <input
                      type="text"
                      value={mapsLink}
                      onChange={e => setMapsLink(e.target.value)}
                      placeholder="Pegá acá el link de Google Maps (opcional)"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#166534] outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Marcar el mapa o pegar el link es opcional — con la zona de entrega ya podemos procesar tu pedido.
                    </p>
                  </div>

                  <div className="relative overflow-hidden bg-gradient-to-r from-[#eeee22]/20 via-[#166534]/10 to-[#eeee22]/20 border-2 border-[#166534] rounded-xl p-3 flex items-start gap-2 shadow-md animate-pulse-strong">
                    <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                    <Truck className="w-5 h-5 text-[#166534] flex-shrink-0 mt-0.5 relative z-10 animate-bounce-x" />
                    <p className="text-xs text-[#166534] font-black relative z-10">
                      🚀 {getEstimatedDeliveryMessage()}
                    </p>
                  </div>
                </>
              )}

              {deliveryType === 'delivery' && deliveryPhase === 'verify' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs font-black text-blue-800 uppercase tracking-wide mb-1">Confirmá tu ubicación</p>
                    <p className="text-xs text-blue-700">Volvé a marcar el mismo punto de entrega, para asegurarnos de que quedó bien registrado.</p>
                  </div>

                  <DeliveryMap
                    lat={confirmCoords?.lat ?? null}
                    lng={confirmCoords?.lng ?? null}
                    onLocationSelect={(lat, lng) => setConfirmCoords({ lat, lng })}
                    centerHint={deliveryCoords}
                    pinColor="red"
                    initialZoom={15}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
                      setConfirmGettingGPS(true);
                      navigator.geolocation.getCurrentPosition(
                        pos => { setConfirmCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setConfirmGettingGPS(false); },
                        (err) => {
                          setConfirmGettingGPS(false);
                          const msg = err.code === 1
                            ? 'Bloqueaste el permiso de ubicación en tu navegador. Activalo en la configuración del sitio, o marcá el pin manualmente.'
                            : err.code === 3
                            ? 'La ubicación tardó demasiado en responder. Intentá de nuevo o marcá el pin manualmente.'
                            : 'No pudimos obtener tu ubicación. Marcá el pin manualmente.';
                          alert(msg);
                        },
                        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                      );
                    }}
                    disabled={confirmGettingGPS}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {confirmGettingGPS ? <><Loader2 className="w-4 h-4 animate-spin" /> Obteniendo ubicación...</> : <>📍 Usar mi ubicación actual</>}
                  </button>

                  {confirmCoords && distanceMeters !== null && (
                    locationsMatch ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <p className="text-xs text-green-800 font-bold">Ubicación confirmada (diferencia de {Math.round(distanceMeters)} m).</p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-red-700 font-bold">
                          ⚠️ Los dos puntos están a {Math.round(distanceMeters)} m de distancia — no coinciden.
                        </p>
                        <button
                          type="button"
                          onClick={() => setConfirmCoords(null)}
                          className="w-full py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-black uppercase"
                        >
                          Volver a marcar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeliveryPhase('mark'); setConfirmCoords(null); }}
                          className="w-full py-2 text-red-600 text-xs font-bold underline"
                        >
                          Prefiero ajustar el primer punto
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  if (deliveryType === 'delivery' && deliveryPhase === 'mark') {
                    if (!deliveryCoords) { alert('Marcá tu ubicación en el mapa antes de continuar.'); return; }
                    setDeliveryPhase('verify');
                    return;
                  }
                  proceedFromDelivery();
                }}
                disabled={deliveryType === 'delivery' && deliveryPhase === 'verify' && !locationsMatch}
                className="w-full py-3.5 bg-[#166534] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {deliveryType === 'delivery' && deliveryPhase === 'mark' ? 'Verificar ubicación' : 'Continuar'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP: CONFIRM ── */}
          {step === 'confirm' && (
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Resumen del pedido</p>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-bold">Gs. {subtotal.toLocaleString('es-PY')}</span></div>
                {deliveryType === 'delivery' && selectedZone && (
                  <div className="flex justify-between"><span className="text-gray-500">Delivery — {selectedZone.name}</span><span className="font-bold">{zoneCost === 0 ? '¡Gratis!' : `Gs. ${zoneCost.toLocaleString('es-PY')}`}</span></div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between">
                  <span className="font-black text-gray-900">Total</span>
                  <span className="font-black text-[#166534] text-lg">Gs. {grandTotal.toLocaleString('es-PY')}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-sm">
                <p><span className="font-bold text-gray-500">Cliente:</span> {custName}</p>
                <p><span className="font-bold text-gray-500">Teléfono:</span> {custPhone}</p>
                <p><span className="font-bold text-gray-500">Pago:</span> {{
                  efectivo: 'Efectivo en el local', transferencia: 'Transferencia bancaria',
                  tarjeta: 'Tarjeta de crédito / débito', pos: 'POS',
                }[paymentMethod!]}</p>
                <p><span className="font-bold text-gray-500">Envío:</span> {deliveryType === 'retiro' ? 'Retiro en el local' : `Delivery — ${selectedZone?.name}`}</p>
                {deliveryCoords && (
                  <p className="text-xs text-gray-400">📍 Coordenadas: {deliveryCoords.lat.toFixed(5)}, {deliveryCoords.lng.toFixed(5)}</p>
                )}
              </div>

              {/* Nota de efectivo */}
              {paymentMethod === 'efectivo' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-2">
                  <Banknote className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 font-bold">
                    Por favor prepará el monto exacto para tu pago al momento del retiro.
                  </p>
                </div>
              )}

              {/* Instrucciones de transferencia */}
              {paymentMethod === 'transferencia' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-2">Datos para la transferencia</p>
                    {config.transfer_bank && <p className="text-sm text-blue-900"><span className="font-bold">Banco:</span> {config.transfer_bank}</p>}
                    {config.transfer_account && <p className="text-sm text-blue-900"><span className="font-bold">Cuenta:</span> {config.transfer_account}</p>}
                    {config.transfer_holder && <p className="text-sm text-blue-900"><span className="font-bold">Titular:</span> {config.transfer_holder}</p>}
                    {!config.transfer_bank && !config.transfer_account && (
                      <p className="text-sm text-blue-700">Contactanos por WhatsApp para los datos de transferencia.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Comprobante de pago *</p>
                    {!proofUrl ? (
                      <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${uploadingProof ? 'border-gray-200' : 'border-[#166534]/40 bg-[#166534]/5 hover:bg-[#166534]/10'}`}>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handleProofUpload(e.target.files[0])} />
                        {uploadingProof ? (
                          <><Loader2 className="w-8 h-8 text-[#166534] animate-spin mb-2" /><p className="text-xs text-gray-500">Subiendo...</p></>
                        ) : (
                          <><Upload className="w-8 h-8 text-[#166534]/60 mb-2" />
                          <p className="text-xs font-bold text-[#166534]">Tocá para subir el comprobante</p>
                          <p className="text-[10px] text-gray-400">JPG · PNG · WebP</p></>
                        )}
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-green-800">Comprobante subido</p>
                          <p className="text-[10px] text-gray-500 truncate">{proofFile?.name}</p>
                        </div>
                        <button onClick={() => { setProofUrl(''); setProofFile(null); }} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'tarjeta' && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                  <CreditCard className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-black text-purple-800 mb-1">Pago con tarjeta</p>
                  <p className="text-xs text-purple-600">Al confirmar se procesará el pago con Pagopar.</p>
                </div>
              )}

              <button onClick={handleSubmitOrder} disabled={isSubmitting || !canConfirm()}
                className="w-full py-3.5 bg-[#166534] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> :
                  paymentMethod === 'tarjeta' ? '💳 Realizar pago' :
                  paymentMethod === 'efectivo' ? '✅ Confirmar pedido' :
                  paymentMethod === 'transferencia' ? '📤 Enviar pedido' :
                  paymentMethod === 'pos' ? '📟 Confirmar pedido con POS' :
                  '✅ Confirmar'}
              </button>

              {paymentMethod === 'pos' && (
                <p className="text-xs text-center text-gray-400">El pago se confirma cuando se procesa con el POS.</p>
              )}
            </div>
          )}

        </div>
      </div>

      {showPrescriptionConfirm && (() => {
        const prescriptionItems = items.filter(i => 
          (isPrescriptionItem ? isPrescriptionItem(i) : i.requires_prescription) === true
        );
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border-2 border-red-300 animate-pulse-strong">
              <div className="flex items-center gap-3 pb-3 border-b border-red-100">
                <div className="text-5xl animate-wiggle">🩺</div>
                <div>
                  <h3 className="text-lg font-black text-red-700 uppercase tracking-tight">
                    Confirmación necesaria
                  </h3>
                  <p className="text-xs text-gray-500">Receta veterinaria obligatoria</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-800 mb-2 uppercase">Tu pedido incluye:</p>
                <ul className="space-y-1">
                  {prescriptionItems.map((item, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2 flex-wrap">
                      <span className="text-red-500 flex-shrink-0">•</span>
                      <span className="font-medium">{item.product_name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">
                Estos productos son <strong>medicamentos controlados</strong>. Al retirar 
                tu pedido deberás presentar la <strong>receta veterinaria firmada por un 
                profesional habilitado</strong>.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPrescriptionOption('upload')}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    prescriptionOption === 'upload' ? 'border-[#166534] bg-[#166534]/5' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-black text-gray-800 mb-2">📎 Subir foto de la receta ahora</p>
                  {prescriptionUrl ? (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-green-800">Receta subida</p>
                        <p className="text-[10px] text-gray-500 truncate">{prescriptionFile?.name}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setPrescriptionUrl(''); setPrescriptionFile(null); }} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingPrescription ? 'border-gray-200' : 'border-[#166534]/40 bg-white hover:bg-[#166534]/5'}`}>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handlePrescriptionUpload(e.target.files[0])} />
                      {uploadingPrescription ? (
                        <><Loader2 className="w-6 h-6 text-[#166534] animate-spin mb-1" /><p className="text-[11px] text-gray-500">Subiendo...</p></>
                      ) : (
                        <><Upload className="w-6 h-6 text-[#166534]/60 mb-1" />
                        <p className="text-[11px] font-bold text-[#166534]">Tocá para subir la foto</p></>
                      )}
                    </label>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setPrescriptionOption('physical'); setPrescriptionUrl(''); setPrescriptionFile(null); }}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    prescriptionOption === 'physical' ? 'border-[#166534] bg-[#166534]/5' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-black text-gray-800">🩺 Voy a entregar la receta física</p>
                  <p className="text-xs text-gray-500 mt-1">
                    La voy a presentar en mano al recibir el pedido o al retirarlo en el local.
                  </p>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowPrescriptionConfirm(false);
                    setPrescriptionOption(null);
                    setPrescriptionFile(null);
                    setPrescriptionUrl('');
                    setUploadingPrescription(false);
                  }}
                  className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowPrescriptionConfirm(false);
                    handleSubmitOrder();
                  }}
                  disabled={!(prescriptionUrl || prescriptionOption === 'physical')}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar y enviar pedido
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
