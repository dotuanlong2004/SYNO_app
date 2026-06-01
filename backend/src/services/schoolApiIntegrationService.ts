/**
 * Service xử lý đồng bộ dữ liệu qua API Key của trường.
 * Lát Cắt 5: Đồng Bộ Dữ Liệu Qua API Key
 */
import axios from 'axios';
import { SupabaseClient } from '@supabase/supabase-js';
import { EncryptionUtils } from '../utils/encryption';

export interface SchoolApiIntegration {
  id: number;
  school_id: string;
  provider_name: string;
  base_url: string;
  api_key_encrypted: string;
  status: string;
  last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: number;
  school_id: string;
  integration_id: number;
  sync_type: string;
  status: string;
  message?: string;
  started_at: string;
  finished_at?: string;
}

export class SchoolApiIntegrationService {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Lấy danh sách tích hợp API của một trường.
   */
  async listIntegrations(schoolId: string): Promise<SchoolApiIntegration[]> {
    const { data, error } = await this.supabase
      .from('school_api_integrations')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('listIntegrations error', error);
      throw error;
    }
    return (data as SchoolApiIntegration[]) ?? [];
  }

  /**
   * Lấy một integration theo ID.
   */
  async getIntegration(id: number): Promise<SchoolApiIntegration | null> {
    const { data, error } = await this.supabase
      .from('school_api_integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('getIntegration error', error);
      return null;
    }
    return data as SchoolApiIntegration;
  }

  /**
   * Tạo mới một integration.
   */
  async createIntegration(params: {
    school_id: string;
    provider_name: string;
    base_url: string;
    api_key_encrypted: string;
  }): Promise<SchoolApiIntegration> {
    const { data, error } = await this.supabase
      .from('school_api_integrations')
      .insert({
        school_id: params.school_id,
        provider_name: params.provider_name,
        base_url: params.base_url,
        api_key_encrypted: params.api_key_encrypted,
        status: 'inactive',
      })
      .select()
      .single();

    if (error) {
      console.error('createIntegration error', error);
      throw error;
    }
    return data as SchoolApiIntegration;
  }

  /**
   * Cập nhật integration.
   */
  async updateIntegration(
    id: number,
    updates: Partial<Pick<SchoolApiIntegration, 'provider_name' | 'base_url' | 'api_key_encrypted' | 'status'>>,
  ): Promise<SchoolApiIntegration> {
    const { data, error } = await this.supabase
      .from('school_api_integrations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('updateIntegration error', error);
      throw error;
    }
    return data as SchoolApiIntegration;
  }

  /**
   * Xóa integration.
   */
  async deleteIntegration(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('school_api_integrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteIntegration error', error);
      throw error;
    }
  }

  /**
   * Kiểm tra kết nối đến API bên thứ ba.
   * Trả về true nếu kết nối thành công (HTTP 200-299).
   */
  async testConnection(integration: SchoolApiIntegration): Promise<{ success: boolean; message: string }> {
    try {
      // Giải mã API Key trước khi sử dụng
      const apiKey = EncryptionUtils.decrypt(integration.api_key_encrypted);

      const response = await axios.get(integration.base_url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        // Cập nhật last_checked_at
        await this.updateIntegration(integration.id, { status: 'active' });
        return { success: true, message: 'Kết nối thành công' };
      }

      return { success: false, message: `HTTP ${response.status}` };
    } catch (e: any) {
      const message = e?.response?.data?.message ?? e?.message ?? 'Không thể kết nối';
      return { success: false, message };
    }
  }

  /**
   * Thực hiện đồng bộ dữ liệu từ API bên thứ ba.
   * 1. Gọi API để lấy dữ liệu.
   * 2. Upsert vào các bảng Supabase tương ứng.
   * 3. Ghi log kết quả.
   */
  async syncData(integration: SchoolApiIntegration): Promise<{ success: boolean; message: string; synced?: number }> {
    const logId = await this.createSyncLog(integration, 'full', 'running');

    try {
      // Giải mã API Key trước khi sử dụng
      const apiKey = EncryptionUtils.decrypt(integration.api_key_encrypted);

      // 1. Gọi API lấy dữ liệu (định dạng JSON mẫu)
      const response = await axios.get(`${integration.base_url}/export`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = response.data as {
        students?: any[];
        timetables?: any[];
        grades?: any[];
        fees?: any[];
      };

      let syncedCount = 0;

      // 2. Upsert dữ liệu vào Supabase
      if (payload.students?.length) {
        await this.upsertStudents(payload.students, integration.school_id);
        syncedCount += payload.students.length;
      }
      if (payload.timetables?.length) {
        await this.upsertTimetables(payload.timetables, integration.school_id);
        syncedCount += payload.timetables.length;
      }
      if (payload.grades?.length) {
        await this.upsertGrades(payload.grades, integration.school_id);
        syncedCount += payload.grades.length;
      }
      if (payload.fees?.length) {
        await this.upsertFees(payload.fees, integration.school_id);
        syncedCount += payload.fees.length;
      }

      // 3. Cập nhật trạng thái integration
      await this.updateIntegration(integration.id, { status: 'active' });

      // 4. Đánh dấu log thành công
      await this.updateSyncLog(logId, 'completed', `Đồng bộ thành công ${syncedCount} bản ghi`);

      return { success: true, message: 'Đồng bộ thành công', synced: syncedCount };
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message ?? e?.message ?? 'Lỗi không xác định';
      await this.updateSyncLog(logId, 'failed', `Lỗi: ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Lấy lịch sử sync log của một integration.
   */
  async getSyncLogs(integrationId: number, limit = 20): Promise<SyncLog[]> {
    const { data, error } = await this.supabase
      .from('school_api_sync_logs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getSyncLogs error', error);
      throw error;
    }
    return (data as SyncLog[]) ?? [];
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async createSyncLog(
    integration: SchoolApiIntegration,
    syncType: string,
    status: string,
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('school_api_sync_logs')
      .insert({
        school_id: integration.school_id,
        integration_id: integration.id,
        sync_type: syncType,
        status,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('createSyncLog error', error);
      throw error;
    }
    return (data as any)!.id;
  }

  private async updateSyncLog(logId: number, status: string, message?: string): Promise<void> {
    const { error } = await this.supabase
      .from('school_api_sync_logs')
      .update({
        status,
        message,
        finished_at: new Date().toISOString(),
      })
      .eq('id', logId);

    if (error) {
      console.error('updateSyncLog error', error);
    }
  }

  private async upsertStudents(students: any[], schoolId: string): Promise<void> {
    if (!students?.length) return;
    const records = students.map((s) => ({ ...s, school_id: schoolId }));
    const { error } = await this.supabase.from('students').upsert(records, { onConflict: 'id' });
    if (error) throw error;
  }

  private async upsertTimetables(timetables: any[], schoolId: string): Promise<void> {
    if (!timetables?.length) return;
    const records = timetables.map((t) => ({ ...t, school_id: schoolId }));
    const { error } = await this.supabase.from('timetables').upsert(records, { onConflict: 'id' });
    if (error) throw error;
  }

  private async upsertGrades(grades: any[], schoolId: string): Promise<void> {
    if (!grades?.length) return;
    const records = grades.map((g) => ({ ...g, school_id: schoolId }));
    const { error } = await this.supabase.from('grades').upsert(records, { onConflict: 'id' });
    if (error) throw error;
  }

  private async upsertFees(fees: any[], schoolId: string): Promise<void> {
    if (!fees?.length) return;
    const records = fees.map((f) => ({ ...f, school_id: schoolId }));
    const { error } = await this.supabase.from('fee_notices').upsert(records, { onConflict: 'id' });
    if (error) throw error;
  }
}