import assert from 'node:assert/strict';

import {
  buildAnnouncementPayload,
  buildAnnouncementPushPayload,
  normalizeAnnouncementPriority,
  shouldSendAnnouncementPush,
} from '../src/services/adminWebAnnouncements';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-announcement-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-announcement-fail] ${name}`);
    throw error;
  }
}

test('buildAnnouncementPayload trims content and defaults to general announcement', () => {
  const payload = buildAnnouncementPayload({
    input: {
      title: ' Thong bao nghi le ',
      content: ' Nha truong thong bao lich nghi. ',
    },
    schoolId: '1',
  });

  assert.deepEqual(payload, {
    title: 'Thong bao nghi le',
    content: 'Nha truong thong bao lich nghi.',
    priority: 'normal',
    is_general: true,
    school_id: '1',
  });
});

test('normalizeAnnouncementPriority accepts only supported priorities', () => {
  assert.equal(normalizeAnnouncementPriority(undefined), 'normal');
  assert.equal(normalizeAnnouncementPriority(' HIGH '), 'high');
  assert.equal(normalizeAnnouncementPriority('urgent'), 'urgent');
  assert.throws(() => normalizeAnnouncementPriority('critical'), /priority must be normal, high, or urgent/);
});

test('buildAnnouncementPayload rejects missing title or content', () => {
  assert.throws(
    () => buildAnnouncementPayload({ input: { title: '', content: 'Body' }, schoolId: '1' }),
    /title and content are required/,
  );
});

test('shouldSendAnnouncementPush is explicit opt-in only', () => {
  assert.equal(shouldSendAnnouncementPush({ send_notification: true }), true);
  assert.equal(shouldSendAnnouncementPush({ send_notification: 'true' }), true);
  assert.equal(shouldSendAnnouncementPush({}), false);
  assert.equal(shouldSendAnnouncementPush({ send_notification: false }), false);
});

test('buildAnnouncementPushPayload creates safe notification data', () => {
  const payload = buildAnnouncementPushPayload({
    token: 'device-token',
    announcement: {
      id: 12,
      title: 'Thong bao',
      priority: 'urgent',
      content: 'Noi dung dai hon 120 ky tu se duoc cat ngan de payload FCM gon va khong lam thong bao qua dai trong notification tray cua dien thoai phu huynh.',
      school_id: '1',
    },
  });

  assert.equal(payload.token, 'device-token');
  assert.equal(payload.title, 'Thong bao');
  assert.equal(payload.body.length, 120);
  assert.deepEqual(payload.data, {
    type: 'announcement',
    announcement_id: '12',
    priority: 'urgent',
    school_id: '1',
  });
});
