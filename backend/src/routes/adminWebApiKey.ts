/**
 * Route xử lý quản lý API Key và đồng bộ dữ liệu cho Admin Web.
 * Lát Cắt 5: Đồng Bộ Dữ Liệu Qua API Key
 */
import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { SchoolApiIntegrationService } from '../services/schoolApiIntegrationService';
import { EncryptionUtils } from '../utils/encryption';

const adminWebApiKeyRouter = (supabase: SupabaseClient) => {
  const router = Router();
  const service = new SchoolApiIntegrationService(supabase);

  /**
   * Lấy danh sách các tích hợp API của một trường.
   */
  router.get('/integrations/:schoolId', async (req: Request, res: Response) => {
    try {
      const { schoolId } = req.params;
      const data = await service.listIntegrations(String(schoolId));
      res.json({ success: true, data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * Tạo mới một tích hợp API.
   */
  router.post('/integrations', async (req: Request, res: Response) => {
    try {
      const { school_id, provider_name, base_url, api_key } = req.body;
      if (!school_id || !provider_name || !base_url || !api_key) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc' });
      }

      // Mã hóa API Key trước khi lưu
      const encryptedKey = EncryptionUtils.encrypt(String(api_key));

      const data = await service.createIntegration({
        school_id: String(school_id),
        provider_name: String(provider_name),
        base_url: String(base_url),
        api_key_encrypted: encryptedKey,
      });
      res.json({ success: true, data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * Cập nhật thông tin tích hợp API.
   */
  router.put('/integrations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // Nếu có cập nhật API Key, phải mã hóa lại
      if (updates.api_key) {
        updates.api_key_encrypted = EncryptionUtils.encrypt(String(updates.api_key));
        delete updates.api_key;
      }

      const data = await service.updateIntegration(parseInt(String(id)), updates);
      res.json({ success: true, data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * Xóa một tích hợp API.
   */
  router.delete('/integrations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await service.deleteIntegration(parseInt(String(id)));
      res.json({ success: true, message: 'Đã xóa tích hợp' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * Kiểm tra kết nối đến API bên thứ ba.
   */
  router.post('/integrations/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const integration = await service.getIntegration(parseInt(String(id)));
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy cấu hình tích hợp' });
      }
      const result = await service.testConnection(integration);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * Kích hoạt đồng bộ dữ liệu.
   */
  router.post('/integrations/:id/sync', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const integration = await service.getIntegration(parseInt(String(id)));
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy cấu hình tích hợp' });
      }
      const result = await service.syncData(integration);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * Lấy lịch sử đồng bộ của một tích hợp.
   */
  router.get('/integrations/:id/logs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const logs = await service.getSyncLogs(parseInt(String(id)));
      res.json({ success: true, data: logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
};

module.exports = { adminWebApiKeyRouter };
