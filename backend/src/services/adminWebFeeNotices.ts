'use strict';

type FeeNoticeRow = {
  student_code?: unknown;
  class_id?: unknown;
  subject_fees?: unknown;
  other_fees?: unknown;
  total_amount?: unknown;
  payment_status?: unknown;
  payment_method?: unknown;
  paid_at?: unknown;
};

type BuildFeeNoticePayloadInput = {
  row: FeeNoticeRow;
  schoolId: string;
  studentId: number | string | null | undefined;
};

const FEE_STATUSES = new Set(['unpaid', 'partial', 'paid']);
const PAYMENT_METHODS = new Set(['online', 'cash']);

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function normalizeFeeStatus(value: unknown): string {
  const status = String(value || '').trim().toLowerCase();
  return FEE_STATUSES.has(status) ? status : 'unpaid';
}

export function normalizePaymentMethod(value: unknown): string | null {
  const method = String(value || '').trim().toLowerCase();
  return PAYMENT_METHODS.has(method) ? method : null;
}

export function buildFeeNoticePayload({ row, schoolId, studentId }: BuildFeeNoticePayloadInput) {
  const studentCode = String(row?.student_code || '').trim();
  if (!studentCode) {
    throw new Error('student_code is required');
  }
  if (studentId === null || studentId === undefined || studentId === '') {
    throw new Error(`student_code ${studentCode} was not found in school ${schoolId}`);
  }

  return {
    school_id: schoolId,
    student_id: studentId,
    student_code: studentCode,
    class_id: String(row?.class_id || '').trim() || null,
    subject_fees: asObject(row?.subject_fees),
    other_fees: asObject(row?.other_fees),
    total_amount: Number(row?.total_amount || 0),
    payment_status: normalizeFeeStatus(row?.payment_status),
    payment_method: normalizePaymentMethod(row?.payment_method),
    paid_at: row?.paid_at || null,
  };
}
