'use strict';

type SchoolPaymentSettingsInput = {
  payment_bank_bin?: unknown;
  payment_account_no?: unknown;
  payment_account_name?: unknown;
  payment_qr_enabled?: unknown;
};

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanDigits(value: unknown): string {
  return cleanText(value).replace(/\s+/g, '');
}

export function normalizeSchoolPaymentSettings(input: SchoolPaymentSettingsInput) {
  const payment_bank_bin = cleanDigits(input.payment_bank_bin);
  const payment_account_no = cleanDigits(input.payment_account_no);
  const payment_account_name = cleanText(input.payment_account_name);
  const payment_qr_enabled = input.payment_qr_enabled === true;

  if (payment_bank_bin && !/^\d{3,12}$/.test(payment_bank_bin)) {
    throw new Error('Mã ngân hàng phải là dãy số từ 3 đến 12 ký tự.');
  }
  if (payment_account_no && !/^[A-Za-z0-9._-]{4,32}$/.test(payment_account_no)) {
    throw new Error('Số tài khoản chỉ được gồm chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.');
  }
  if (payment_account_name && payment_account_name.length > 120) {
    throw new Error('Tên chủ tài khoản không được quá 120 ký tự.');
  }

  if (payment_qr_enabled && (!payment_bank_bin || !payment_account_no || !payment_account_name)) {
    throw new Error('Muốn bật QR chuyển khoản thì phải nhập đủ mã ngân hàng, số tài khoản và tên chủ tài khoản.');
  }

  return {
    payment_bank_bin: payment_bank_bin || null,
    payment_account_no: payment_account_no || null,
    payment_account_name: payment_account_name || null,
    payment_qr_enabled,
  };
}

export function publicSchoolPaymentSettings(row: Record<string, unknown> | null | undefined) {
  return {
    payment_bank_bin: cleanText(row?.payment_bank_bin),
    payment_account_no: cleanText(row?.payment_account_no),
    payment_account_name: cleanText(row?.payment_account_name),
    payment_qr_enabled: row?.payment_qr_enabled === true,
    configured: Boolean(row?.payment_bank_bin && row?.payment_account_no && row?.payment_account_name && row?.payment_qr_enabled === true),
  };
}
