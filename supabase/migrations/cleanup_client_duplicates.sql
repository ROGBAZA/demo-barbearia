-- Cleanup script for existing duplicate clients
-- 🚨 RUN THIS FIRST before running 20260215_fix_client_duplicates.sql
-- This script identifies and merges duplicate clients based on phone number

-- ============================================
-- STEP 1: View duplicates (READ-ONLY)
-- ============================================
-- Run this first to see what will be affected

WITH duplicates AS (
    SELECT 
        c.tenant_id,
        t.nome as tenant_name,
        regexp_replace(c.telefone, '[^0-9]', '', 'g') as normalized_phone,
        c.telefone as original_phone,
        array_agg(c.id ORDER BY c.data_cadastro ASC) as cliente_ids,
        array_agg(c.nome ORDER BY c.data_cadastro ASC) as nomes,
        array_agg(c.data_cadastro ORDER BY c.data_cadastro ASC) as datas,
        COUNT(*) as duplicate_count
    FROM public.clientes c
    JOIN public.tenants t ON c.tenant_id = t.id
    WHERE c.telefone IS NOT NULL 
    AND c.telefone != ''
    GROUP BY c.tenant_id, t.nome, regexp_replace(c.telefone, '[^0-9]', '', 'g'), c.telefone
    HAVING COUNT(*) > 1
)
SELECT 
    tenant_name,
    original_phone,
    normalized_phone,
    duplicate_count,
    nomes,
    cliente_ids,
    datas
FROM duplicates
ORDER BY tenant_name, duplicate_count DESC;

-- ============================================
-- STEP 2: Merge duplicates (WRITE OPERATION)
-- ============================================
-- 🚨 ONLY RUN THIS AFTER REVIEWING STEP 1 RESULTS
-- This will keep the oldest client and merge all references

-- Comment out the block below until you're ready to execute
/*
DO $$
DECLARE
    dup RECORD;
    keep_id UUID;
    delete_ids UUID[];
    total_merged INT := 0;
BEGIN
    FOR dup IN 
        WITH duplicates AS (
            SELECT 
                tenant_id,
                regexp_replace(telefone, '[^0-9]', '', 'g') as normalized_phone,
                telefone as original_phone,
                array_agg(id ORDER BY data_cadastro ASC) as ids,
                array_agg(nome ORDER BY data_cadastro ASC) as nomes,
                COUNT(*) as dup_count
            FROM public.clientes
            WHERE telefone IS NOT NULL 
            AND telefone != ''
            GROUP BY tenant_id, regexp_replace(telefone, '[^0-9]', '', 'g'), telefone
            HAVING COUNT(*) > 1
        )
        SELECT * FROM duplicates
    LOOP
        keep_id := dup.ids[1];  -- Keep the oldest client
        delete_ids := dup.ids[2:array_length(dup.ids, 1)];  -- Mark rest for deletion
        
        RAISE NOTICE 'Processing phone %. Keeping client % (%), merging % duplicates',
            dup.original_phone,
            keep_id,
            dup.nomes[1],
            array_length(delete_ids, 1);
        
        -- Update agendamentos references
        UPDATE public.agendamentos
        SET cliente_id = keep_id,
            updated_at = NOW()
        WHERE cliente_id = ANY(delete_ids);
        
        -- Update fila_espera references (if table exists)
        BEGIN
            UPDATE public.fila_espera
            SET cliente_id = keep_id,
                updated_at = NOW()
            WHERE cliente_id = ANY(delete_ids);
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Table fila_espera not found, skipping';
        END;
        
        -- Update assinaturas_clientes references (if table exists)
        BEGIN
            UPDATE public.assinaturas_clientes
            SET cliente_id = keep_id,
                updated_at = NOW()
            WHERE cliente_id = ANY(delete_ids);
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Table assinaturas_clientes not found, skipping';
        END;
        
        -- Delete duplicate clients
        DELETE FROM public.clientes
        WHERE id = ANY(delete_ids);
        
        total_merged := total_merged + array_length(delete_ids, 1);
    END LOOP;
    
    RAISE NOTICE '✅ Cleanup complete! Merged % duplicate clients', total_merged;
END $$;
*/

-- ============================================
-- STEP 3: Verify cleanup (READ-ONLY)
-- ============================================
-- Run this after STEP 2 to confirm no duplicates remain

WITH duplicates AS (
    SELECT 
        tenant_id,
        regexp_replace(telefone, '[^0-9]', '', 'g') as normalized_phone,
        COUNT(*) as dup_count
    FROM public.clientes
    WHERE telefone IS NOT NULL 
    AND telefone != ''
    GROUP BY tenant_id, regexp_replace(telefone, '[^0-9]', '', 'g')
    HAVING COUNT(*) > 1
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No duplicates found!'
        ELSE '❌ Still have ' || COUNT(*) || ' duplicates'
    END as status,
    COALESCE(SUM(dup_count), 0) as total_duplicates
FROM duplicates;
