-- CRIAÇÃO DO BUCKET DE BRANDING
-- 1. Inserir o bucket se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir acesso PÚBLICO para leitura (Logos aparecem no site público)
DROP POLICY IF EXISTS "Public Assets Access" ON storage.objects;
CREATE POLICY "Public Assets Access" ON storage.objects 
FOR SELECT USING ( bucket_id = 'company-assets' );

-- 3. Permitir UPLOAD apenas para usuários autenticados (Donos de barbearia)
DROP POLICY IF EXISTS "Auth Users Upload Assets" ON storage.objects;
CREATE POLICY "Auth Users Upload Assets" ON storage.objects 
FOR INSERT WITH CHECK ( 
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated' 
);

-- 4. Permitir UPDATE/DELETE apenas para donos (Opcional, mas recomendado)
DROP POLICY IF EXISTS "Auth Users Update Assets" ON storage.objects;
CREATE POLICY "Auth Users Update Assets" ON storage.objects 
FOR UPDATE USING ( 
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated' 
);

DROP POLICY IF EXISTS "Auth Users Delete Assets" ON storage.objects;
CREATE POLICY "Auth Users Delete Assets" ON storage.objects 
FOR DELETE USING ( 
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated' 
);
