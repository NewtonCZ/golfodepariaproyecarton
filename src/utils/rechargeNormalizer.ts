import { RechargeTransaction, TransactionStatus } from '../types';

/**
 * Robust normalizer for Recharge transactions from Supabase (recargas_pago_movil / recharges)
 * and Realtime postgres_changes payloads, guaranteeing complete field population without undefined values.
 */
export function normalizeRechargeTransaction(raw: any): RechargeTransaction {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `rch-${Date.now()}`,
      userId: '',
      userName: 'Usuario',
      userPhone: '',
      amountVes: 0,
      payerPhone: '',
      payerName: '',
      payerDocumentId: '',
      bankOrigin: 'Pago Móvil',
      referenceNumber: '',
      voucherImageUrl: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  const rawStatus = String(raw.status || raw.estado || raw.estatus || 'pending').toLowerCase().trim();
  const isApproved =
    rawStatus === 'aprobada' ||
    rawStatus === 'aprobado' ||
    rawStatus === 'approved' ||
    rawStatus === 'completada' ||
    rawStatus === 'completado';
  const isRejected =
    rawStatus === 'rechazada' ||
    rawStatus === 'rechazado' ||
    rawStatus === 'rejected';

  const status: TransactionStatus = isApproved
    ? 'approved'
    : isRejected
    ? 'rejected'
    : 'pending';

  const amount = Number(
    raw.amountVes ??
    raw.amount_ves ??
    raw.monto_ves ??
    raw.monto ??
    raw.amount ??
    0
  );

  return {
    ...raw,
    id: String(raw.id || `rch-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    userId: String(raw.userId || raw.user_id || raw.usuario_id || ''),
    userName: String(raw.userName || raw.user_name || raw.usuario_nombre || raw.pagador_nombre || 'Usuario'),
    userPhone: String(raw.userPhone || raw.user_phone || raw.usuario_telefono || raw.telefono_pagador || raw.payerPhone || raw.payer_phone || ''),
    amountVes: isNaN(amount) ? 0 : amount,
    payerPhone: String(raw.payerPhone || raw.payer_phone || raw.telefono_pagador || raw.usuario_telefono || ''),
    payerName: String(raw.payerName || raw.payer_name || raw.pagador_nombre || raw.usuario_nombre || ''),
    payerDocumentId: String(raw.payerDocumentId || raw.payer_document_id || raw.cedula_pagador || raw.pagador_ci || raw.cedula || ''),
    bankOrigin: String(raw.bankOrigin || raw.bank_origin || raw.banco_origen || raw.banco || 'Pago Móvil'),
    referenceNumber: String(raw.referenceNumber || raw.reference_number || raw.referencia || ''),
    voucherImageUrl: String(raw.voucherImageUrl || raw.voucher_image_url || raw.comprobante_url || ''),
    status,
    createdAt: String(raw.createdAt || raw.created_at || raw.fecha || new Date().toISOString()),
    processedAt: raw.processedAt || raw.processed_at || raw.fecha_procesado || raw.reviewedAt || raw.reviewed_at || '',
    processedBy: raw.processedBy || raw.processed_by || raw.procesado_por || raw.reviewedBy || raw.reviewed_by || '',
    rejectionReason: raw.rejectionReason || raw.rejection_reason || raw.motivo_rechazo || '',
  };
}
