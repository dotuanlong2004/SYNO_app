import assert from 'node:assert/strict';

import { buildFeeNoticePayload, normalizeFeeStatus, normalizePaymentMethod, normalizeTotalAmount } from '../src/services/adminWebFeeNotices';
import { buildFeePaymentQr, validateSimulatedPayment } from '../src/services/paymentQr';
import { normalizeSchoolPaymentSettings, publicSchoolPaymentSettings } from '../src/services/schoolPaymentSettings';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-fee-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-fee-fail] ${name}`);
    throw error;
  }
}

test('buildFeeNoticePayload requires a resolved student id', () => {
  assert.throws(
    () =>
      buildFeeNoticePayload({
        row: { student_code: 'HS404', total_amount: 100000 },
        schoolId: '1',
        studentId: null,
      }),
    /student_code HS404 was not found/,
  );
});

test('buildFeeNoticePayload creates a school-scoped fee notice payload', () => {
  const payload = buildFeeNoticePayload({
    row: {
      student_code: ' HS0085 ',
      class_id: ' 10A1 ',
      subject_fees: { toan: 300000 },
      other_fees: { ban_tru: 200000 },
      total_amount: '500000',
      payment_status: 'paid',
      payment_method: 'cash',
      paid_at: '2026-05-26T08:00:00.000Z',
    },
    schoolId: '1',
    studentId: 85,
  });

  assert.deepEqual(payload, {
    school_id: '1',
    student_id: 85,
    student_code: 'HS0085',
    class_id: '10A1',
    subject_fees: { toan: 300000 },
    other_fees: { ban_tru: 200000 },
    total_amount: 500000,
    payment_status: 'paid',
    payment_method: 'cash',
    paid_at: '2026-05-26T08:00:00.000Z',
  });
});

test('fee status and payment method normalization use safe defaults', () => {
  assert.equal(normalizeFeeStatus('partial'), 'partial');
  assert.equal(normalizeFeeStatus('bad-status'), 'unpaid');
  assert.equal(normalizePaymentMethod('online'), 'online');
  assert.equal(normalizePaymentMethod('bank-transfer'), null);
});

test('normalizeTotalAmount accepts finite non-negative amounts', () => {
  assert.equal(normalizeTotalAmount('0'), 0);
  assert.equal(normalizeTotalAmount('500000'), 500000);
});

test('normalizeTotalAmount rejects invalid or negative amounts', () => {
  assert.throws(() => normalizeTotalAmount('abc'), /total_amount must be a non-negative number/);
  assert.throws(() => normalizeTotalAmount(-1), /total_amount must be a non-negative number/);
});

test('buildFeePaymentQr creates deterministic transfer content without changing payment status', () => {
  const qr = buildFeePaymentQr({
    feeId: 4,
    studentCode: 'HS0085',
    amount: 2200000,
  });

  assert.equal(qr.amount, 2200000);
  assert.equal(qr.add_info, 'SYNO HS0085 HP4');
});

test('validateSimulatedPayment requires exact amount match', () => {
  assert.deepEqual(
    validateSimulatedPayment({ expectedAmount: 2200000, receivedAmount: '2200000' }),
    { expected: 2200000, received: 2200000 },
  );
  assert.throws(
    () => validateSimulatedPayment({ expectedAmount: 2200000, receivedAmount: '2199000' }),
    /Số tiền nhận được không khớp/,
  );
});

test('school payment settings require complete bank details before enabling QR', () => {
  assert.throws(
    () => normalizeSchoolPaymentSettings({ payment_qr_enabled: true, payment_bank_bin: '970436' }),
    /nhập đủ/,
  );
  const settings = normalizeSchoolPaymentSettings({
    payment_qr_enabled: true,
    payment_bank_bin: '970436',
    payment_account_no: ' 123456789 ',
    payment_account_name: 'TRUONG HUU NGHI',
  });
  assert.deepEqual(settings, {
    payment_qr_enabled: true,
    payment_bank_bin: '970436',
    payment_account_no: '123456789',
    payment_account_name: 'TRUONG HUU NGHI',
  });
  assert.equal(publicSchoolPaymentSettings(settings).configured, true);
});
