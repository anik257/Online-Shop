import { jsPDF } from 'jspdf';
import { BRAND } from '../lib/brand';
import { formatPaymentMethod } from '../services/paymentGateways';
import type { OrderConfirmationDetails } from '../services/orders';

export function generateReceiptPdf(order: OrderConfirmationDetails) {
  if (!order) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const line = () => {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  // Header
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  doc.text(BRAND.name.toUpperCase(), margin, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#AAAAAA');
  doc.text('ORDER RECEIPT', pageW - margin, 14, { align: 'right' });
  y = 30;

  // Order Meta
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#111111');
  doc.text(order.order_number, margin, y);
  y += 8;

  if (order.created_at) {
    const dateStr = new Date(order.created_at).toLocaleDateString('en-BD', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(`Date: ${dateStr}`, margin, y);
    y += 6;
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  doc.text(`Order Status: ${cap(order.order_status)}   Payment Status: ${cap(order.payment_status)}`, margin, y);
  y += 8;
  line();

  // Customer & Delivery
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#111111');
  doc.text('CUSTOMER INFORMATION', margin, y);
  y += 5;

  const info: [string, string][] = [
    ['Name', order.customer_name],
    ['Phone', order.phone],
    ...(order.email ? [['Email', order.email] as [string, string]] : []),
    ['Address', order.address],
    ...(order.area ? [['Area', order.area] as [string, string]] : []),
    ['District', order.district],
    ['Division', `${order.division} Division`],
    ...(order.delivery_notes ? [['Note', order.delivery_notes] as [string, string]] : []),
  ];
  info.forEach(([label, value]) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111111');
    const wrapped = doc.splitTextToSize(value, contentW - 35);
    doc.text(wrapped, margin + 32, y);
    y += wrapped.length * 5;
  });
  y += 2;
  line();

  // Items Table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#111111');
  doc.text('ORDERED ITEMS', margin, y);
  y += 5;
  // Header row
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 3.5, contentW, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#444444');
  doc.text('PRODUCT', margin + 1, y);
  doc.text('QTY', margin + contentW * 0.6, y);
  doc.text('UNIT PRICE', margin + contentW * 0.72, y);
  doc.text('SUBTOTAL', pageW - margin - 1, y, { align: 'right' });
  y += 5;
  line();

  const sym = BRAND.currency.symbol;
  (order.items || []).forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name, contentW * 0.55);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111111');
    doc.text(nameLines, margin + 1, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#444444');
    doc.text(String(item.quantity), margin + contentW * 0.6, y);
    doc.text(`${sym}${Number(item.unit_price).toLocaleString('en-BD')}`, margin + contentW * 0.72, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111111');
    doc.text(`${sym}${Number(item.subtotal).toLocaleString('en-BD')}`, pageW - margin - 1, y, { align: 'right' });
    y += nameLines.length * 5 + 2;
  });
  y += 2;
  line();

  // Totals
  const totals: [string, string, boolean][] = [
    ['Subtotal', `${sym}${Number(order.subtotal).toLocaleString('en-BD')}`, false],
    ['Delivery Charge', Number(order.delivery_charge) === 0 ? 'FREE' : `${sym}${Number(order.delivery_charge).toLocaleString('en-BD')}`, false],
    ['TOTAL AMOUNT', `${sym}${Number(order.total_amount).toLocaleString('en-BD')}`, true],
  ];
  totals.forEach(([label, value, isBold]) => {
    doc.setFontSize(isBold ? 11 : 8.5);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(isBold ? '#000000' : '#444444');
    doc.text(label, margin, y);
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += isBold ? 8 : 6;
  });
  y += 2;
  line();

  // Payment method
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#666666');
  doc.text('Payment Method: ', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#111111');
  doc.text(formatPaymentMethod(order.payment_method), margin + 35, y);
  y += 6;

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(15, 15, 15);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#AAAAAA');
  doc.text(`${BRAND.name} · ${BRAND.support.phone} · ${BRAND.support.email}`, pageW / 2, pageH - 6, { align: 'center' });

  const filename = `Outfit-Avenue-Order-${order.order_number}.pdf`;
  doc.save(filename);
}
