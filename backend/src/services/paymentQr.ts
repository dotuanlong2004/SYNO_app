'use strict';

type FeePaymentQrInput = {
  feeId: number | string;
  studentCode: string;
  amount: number;
  paymentConfig?: PaymentConfigInput | null;
};

type SimulatePaymentInput = {
  expectedAmount: unknown;
  receivedAmount: unknown;
};

type PaymentConfigInput = {
  bankBin?: unknown;
  accountNo?: unknown;
  accountName?: unknown;
  enabled?: unknown;
};

function normalizeAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  return Math.round(amount);
}

function normalizeConfig(config: PaymentConfigInput) {
  const bankBin = String(config.bankBin || '').trim();
  const accountNo = String(config.accountNo || '').trim();
  const accountName = String(config.accountName || '').trim();
  const enabled = config.enabled !== false;

  return {
    bankBin,
    accountNo,
    accountName,
    configured: Boolean(enabled && bankBin && accountNo && accountName),
  };
}

function getPaymentConfig(config?: PaymentConfigInput | null) {
  if (config) {
    return normalizeConfig(config);
  }

  const bankBin = String(process.env.SYNO_PAYMENT_BANK_BIN || '').trim();
  const accountNo = String(process.env.SYNO_PAYMENT_ACCOUNT_NO || '').trim();
  const accountName = String(process.env.SYNO_PAYMENT_ACCOUNT_NAME || '').trim();

  return normalizeConfig({ bankBin, accountNo, accountName, enabled: true });
}

function buildTransferContent({ feeId, studentCode }: Pick<FeePaymentQrInput, 'feeId' | 'studentCode'>) {
  const safeStudentCode = String(studentCode || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  const safeFeeId = String(feeId || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  return `SYNO ${safeStudentCode} HP${safeFeeId}`.trim();
}

export function buildFeePaymentQr(input: FeePaymentQrInput) {
  const amount = normalizeAmount(input.amount);
  const config = getPaymentConfig(input.paymentConfig);
  const addInfo = buildTransferContent(input);

  if (!config.configured) {
    return {
      configured: false,
      amount,
      add_info: addInfo,
      message: 'Nhà trường chưa cấu hình tài khoản nhận chuyển khoản.',
    };
  }

  const qrUrl =
    `https://img.vietqr.io/image/${encodeURIComponent(config.bankBin)}-${encodeURIComponent(config.accountNo)}-compact2.png` +
    `?amount=${encodeURIComponent(String(amount))}` +
    `&addInfo=${encodeURIComponent(addInfo)}` +
    `&accountName=${encodeURIComponent(config.accountName)}`;

  return {
    configured: true,
    bank_bin: config.bankBin,
    account_no: config.accountNo,
    account_name: config.accountName,
    amount,
    add_info: addInfo,
    qr_url: qrUrl,
    note: 'Chỉ chuyển khoản đúng số tiền và đúng nội dung để nhà trường đối soát.',
  };
}

export function validateSimulatedPayment({ expectedAmount, receivedAmount }: SimulatePaymentInput) {
  const expected = normalizeAmount(expectedAmount);
  const received = normalizeAmount(receivedAmount);
  if (received !== expected) {
    throw new Error(`Số tiền nhận được không khớp. Cần ${expected}, nhận ${received}.`);
  }
  return { expected, received };
}
