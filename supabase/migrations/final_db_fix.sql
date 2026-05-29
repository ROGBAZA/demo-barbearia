-- 1. CORREÇÃO DE CADASTRO (Erro 'column "status" does not exist')
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. CORREÇÃO DE RELATÓRIO (Erro 'concluido_em' e 'valor_cobrado')
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS valor_cobrado NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- 3. CORREÇÃO DE UPLOAD (Criar bucket company-assets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
DROP POLICY IF EXISTS "Public Assets Access" ON storage.objects;
CREATE POLICY "Public Assets Access" ON storage.objects 
FOR SELECT USING ( bucket_id = 'company-assets' );

DROP POLICY IF EXISTS "Auth Users Upload Assets" ON storage.objects;
CREATE POLICY "Auth Users Upload Assets" ON storage.objects 
FOR INSERT WITH CHECK ( 
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated' 
);

DROP POLICY IF EXISTS "Auth Users Update Assets" ON storage.objects;
CREATE POLICY "Auth Users Update Assets" ON storage.objects 
FOR UPDATE USING ( 
  bucket_id = 'company-assets' 
  AND auth.role() = 'authenticated' 
);
