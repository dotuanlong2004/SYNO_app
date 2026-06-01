import { EventEmitter } from 'events';

/**
 * eventBus.ts
 * Module chia sẻ EventEmitter dùng cho SSE (Server-Sent Events).
 * Mobile route lắng nghe, adminWeb route emit khi có thay đổi dữ liệu.
 */

const eventBus = new EventEmitter();
// Tăng giới hạn listeners để tránh cảnh báo với nhiều client kết nối SSE
eventBus.setMaxListeners(200);

/**
 * Emit sự kiện sync cho một school
 * @param {string|number} schoolId
 * @param {string} dataType - loại dữ liệu: 'timetable','fee','grade','announcement','chat'
 * @param {string} action - 'create','update','delete'
 */
function emitSyncEvent(schoolId: string | number, dataType: string, action: string) {
  const eventName = `sync:${schoolId}`;
  eventBus.emit(eventName, { dataType, action, ts: new Date().toISOString() });
}

export { eventBus, emitSyncEvent };