-- SCRIPT MÁGICO DE CORREÇÃO DE TODOS OS UPLOADS
-- Cria e libera buckets para Funcionários, Serviços e Marca

-- 1. BUCKET AVATARS (Funcionários)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Avatars Access" ON storage.objects;
CREATE POLICY "Public Avatars Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Auth Avatars Upload" ON storage.objects;
CREATE POLICY "Auth Avatars Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth Avatars Update" ON storage.objects;
CREATE POLICY "Auth Avatars Update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 2. BUCKET SERVICES (Serviços)
INSERT INTO storage.buckets (id, name, public) VALUES ('services', 'services', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Services Access" ON storage.objects;
CREATE POLICY "Public Services Access" ON storage.objects FOR SELECT USING (bucket_id = 'services');
DROP POLICY IF EXISTS "Auth Services Upload" ON storage.objects;
CREATE POLICY "Auth Services Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'services' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth Services Update" ON storage.objects;
CREATE POLICY "Auth Services Update" ON storage.objects FOR UPDATE USING (bucket_id = 'services' AND auth.role() = 'authenticated');

-- 3. BUCKET COMPANY-ASSETS (Logo/Banner - Reforço)
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Company Assets Access" ON storage.objects;
CREATE POLICY "Public Company Assets Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
DROP POLICY IF EXISTS "Auth Company Assets Upload" ON storage.objects;
CREATE POLICY "Auth Company Assets Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
