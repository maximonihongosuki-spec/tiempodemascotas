import { Sale, SaleItem } from './supabase';
import { format } from 'date-fns';

type SiteSettings = {
  business_name: string;
  logo_url: string;
  ruc: string;
  timbrado: string;
  business_address: string;
  business_email: string;
  business_phones: string;
  timbrado_start_date: string;
  invoice_control_code: string;
};

export function generateInvoicePDF(sale: Sale, items: SaleItem[], settings: SiteSettings) {
  const calculateTotals = () => {
    let subtotalExento = 0;
    let subtotal5 = 0;
    let subtotal10 = 0;

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price;

      if (item.tax_exempt) {
        subtotalExento += itemSubtotal;
      } else if (item.tax_rate === 0.05) {
        subtotal5 += itemSubtotal;
      } else {
        subtotal10 += itemSubtotal;
      }
    });

    const iva5 = subtotal5 * 0.05;
    const iva10 = subtotal10 * 0.10;
    const totalIVA = iva5 + iva10;
    const totalGeneral = subtotalExento + subtotal5 + subtotal10 + totalIVA;

    return {
      subtotalExento,
      subtotal5,
      subtotal10,
      iva5,
      iva10,
      totalIVA,
      totalGeneral,
      liquidacion5: subtotal5 * 0.05,
      liquidacion10: subtotal10 * 0.10
    };
  };

  const totals = calculateTotals();

  const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Factura ${sale.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      padding: 20px;
      color: #000;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #000;
    }

    .header {
      display: flex;
      border-bottom: 2px solid #000;
    }

    .header-left {
      flex: 1;
      padding: 15px;
      border-right: 2px solid #000;
    }

    .header-right {
      flex: 1;
      padding: 15px;
    }

    .business-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .business-info {
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .header-right-title {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 10px;
    }

    .header-right-info {
      font-size: 10px;
      margin-bottom: 4px;
    }

    .info-section {
      display: flex;
      border-bottom: 2px solid #000;
    }

    .info-left {
      flex: 1;
      padding: 10px;
      border-right: 2px solid #000;
    }

    .info-right {
      flex: 1;
      padding: 10px;
    }

    .info-row {
      display: flex;
      margin-bottom: 5px;
    }

    .info-label {
      font-weight: bold;
      width: 180px;
    }

    .info-value {
      flex: 1;
    }

    .items-section {
      border-bottom: 2px solid #000;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      background-color: #f0f0f0;
      border: 1px solid #000;
      padding: 8px 5px;
      text-align: center;
      font-weight: bold;
      font-size: 10px;
    }

    .items-table td {
      border: 1px solid #000;
      padding: 8px 5px;
      font-size: 10px;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .footer-section {
      display: flex;
    }

    .qr-section {
      width: 120px;
      padding: 10px;
      border-right: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .totals-section {
      flex: 1;
    }

    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }

    .totals-table td {
      border: 1px solid #000;
      padding: 5px 8px;
      font-size: 10px;
    }

    .totals-label {
      font-weight: bold;
      background-color: #f0f0f0;
    }

    .total-row {
      font-weight: bold;
      font-size: 11px;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(to right, #E91E8C, #6B4199);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .print-button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Imprimir / Guardar PDF</button>

  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <div class="business-name">${settings.business_name || 'NOMBRE DEL NEGOCIO'}</div>
        <div class="business-info">${settings.business_address || 'Dirección del negocio'}</div>
        <div class="business-info">${settings.business_phones || 'Teléfonos'}</div>
        ${settings.business_email ? `<div class="business-info">${settings.business_email}</div>` : ''}
      </div>
      <div class="header-right">
        <div class="header-right-title">TIMBRADO N° ${settings.timbrado || 'N/A'}</div>
        <div class="header-right-info">CÓDIGO CONTROL ${settings.invoice_control_code || 'N/A'}</div>
        <div class="header-right-info">INICIO DE VIGENCIA ${settings.timbrado_start_date ? format(new Date(settings.timbrado_start_date), 'dd/MM/yyyy') : 'N/A'}</div>
        <div class="header-right-info">RUC ${settings.ruc || 'N/A'}</div>
        <div class="header-right-title" style="margin-top: 10px;">FACTURA VIRTUAL</div>
        <div class="header-right-title">${sale.invoice_number}</div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-left">
        <div class="info-row">
          <span class="info-label">FECHA DE EMISIÓN:</span>
          <span class="info-value">${format(new Date(sale.invoice_date), 'dd/MM/yyyy')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">RUC O CÉDULA DE IDENTIDAD:</span>
          <span class="info-value">${sale.customer_document}</span>
        </div>
        <div class="info-row">
          <span class="info-label">NOMBRE O RAZÓN SOCIAL:</span>
          <span class="info-value">${sale.customer_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">DIRECCIÓN:</span>
          <span class="info-value">${sale.customer_address || ''}</span>
        </div>
      </div>
      <div class="info-right">
        <div class="info-row">
          <span class="info-label">CONDICIÓN DE VENTA:</span>
          <span class="info-value">${sale.sale_type === 'cash' ? 'CONTADO' : 'CRÉDITO'}</span>
        </div>
        ${sale.sale_type === 'credit' ? '<div class="info-row"><span class="info-label">NÚMERO DE NOTA DE REMISIÓN:</span><span class="info-value"></span></div>' : ''}
      </div>
    </div>

    <div class="items-section">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 60px;">Cantidad</th>
            <th style="width: auto;">Descripción</th>
            <th style="width: 100px;">Precio<br/>Unitario</th>
            <th style="width: 80px;" colspan="3">Valor Venta</th>
          </tr>
          <tr>
            <th colspan="3"></th>
            <th style="width: 80px;">Exentas</th>
            <th style="width: 80px;">IVA 5%</th>
            <th style="width: 80px;">IVA 10%</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const itemSubtotal = item.quantity * item.unit_price;
            let exenta = 0, iva5 = 0, iva10 = 0;

            if (item.tax_exempt) {
              exenta = itemSubtotal;
            } else if (item.tax_rate === 0.05) {
              iva5 = itemSubtotal;
            } else {
              iva10 = itemSubtotal;
            }

            return `
              <tr>
                <td class="text-center">${item.quantity}</td>
                <td>${item.product_name}${item.product_code ? ` (${item.product_code})` : ''}</td>
                <td class="text-right">${item.unit_price.toLocaleString('es-PY')}</td>
                <td class="text-right">${exenta > 0 ? exenta.toLocaleString('es-PY') : ''}</td>
                <td class="text-right">${iva5 > 0 ? iva5.toLocaleString('es-PY') : ''}</td>
                <td class="text-right">${iva10 > 0 ? iva10.toLocaleString('es-PY') : ''}</td>
              </tr>
            `;
          }).join('')}
          ${Array(Math.max(0, 5 - items.length)).fill(0).map(() => `
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer-section">
      <div class="qr-section">
        <div style="width: 80px; height: 80px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center;">
          QR<br/>CODE
        </div>
      </div>
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="totals-label">Valor Parcial</td>
            <td class="text-right">${totals.subtotalExento.toLocaleString('es-PY')}</td>
            <td class="text-right">${totals.subtotal5.toLocaleString('es-PY')}</td>
            <td class="text-right">${totals.subtotal10.toLocaleString('es-PY')}</td>
          </tr>
          <tr>
            <td class="totals-label">Total a Pagar</td>
            <td colspan="3" class="text-right total-row">${totals.totalGeneral.toLocaleString('es-PY')}</td>
          </tr>
          <tr>
            <td class="totals-label">Liquidación del IVA:</td>
            <td class="text-right">(5%) ${totals.liquidacion5.toLocaleString('es-PY')}</td>
            <td class="text-right" colspan="2">(10%) ${totals.liquidacion10.toLocaleString('es-PY')}</td>
          </tr>
          <tr>
            <td class="totals-label" colspan="3">Total IVA</td>
            <td class="text-right total-row">${totals.totalIVA.toLocaleString('es-PY')}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(invoiceHTML);
    newWindow.document.close();
  } else {
    alert('Por favor, permita ventanas emergentes para generar la factura');
  }
}
