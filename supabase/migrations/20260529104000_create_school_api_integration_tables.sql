-- Lát Cắt 5: Đồng Bộ Dữ Liệu Qua API Key
-- Tạo bảng quản lý tích hợp API của trường và log đồng bộ

-- 1. Bảng cấu hình tích hợp API
CREATE TABLE public.school_api_integrations (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    provider_name text NOT NULL,
    base_url text NOT NULL,
    api_key_encrypted text NOT NULL,
    status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    last_checked_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Bảng log lịch sử đồng bộ
CREATE TABLE public.school_api_sync_logs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    integration_id bigint NOT NULL REFERENCES public.school_api_integrations(id) ON DELETE CASCADE,
    sync_type text NOT NULL, -- 'full', 'incremental'
    status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    message text,
    started_at timestamptz DEFAULT now(),
    finished_at timestamptz
);

-- 3. Bật RLS
ALTER TABLE public.school_api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_api_sync_logs ENABLE ROW LEVEL SECURITY;

-- 4. Chính sách bảo mật (RLS Policies)
-- Chỉ cho phép truy cập dữ liệu thuộc về school_id của user
CREATE POLICY "School admins can manage their own API integrations" 
ON public.school_api_integrations
FOR ALL 
TO authenticated
USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
WITH CHECK (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid);

CREATE POLICY "School admins can view their own sync logs" 
ON public.school_api_sync_logs
FOR ALL 
TO authenticated
USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
WITH CHECK (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid);

-- 5. Cấp quyền
GRANT ALL ON TABLE public.school_api_integrations TO authenticated;
GRANT ALL ON TABLE public.school_api_sync_logs TO authenticated;