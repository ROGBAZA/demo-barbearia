#!/usr/bin/env node

/**
 * Script para adicionar a coluna metodo_pagamento automaticamente via Supabase API
 * Uso: node add-payment-column.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Credenciais do Supabase não encontradas no .env');
    console.log('Certifique-se de ter VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPaymentColumn() {
    console.log('🔧 Tentando adicionar coluna metodo_pagamento...');

    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            query: `
        ALTER TABLE agendamentos 
        ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' 
        CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));
        
        COMMENT ON COLUMN agendamentos.metodo_pagamento IS 'Payment method: dinheiro (cash), pix, or cartao (card)';
      `
        });

        if (error) {
            console.error('❌ Erro ao executar SQL:', error.message);
            console.log('\n📋 Execute manualmente no Supabase Dashboard:');
            console.log('https://supabase.com/dashboard/project/_/sql/new\n');
            console.log(`ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));`);
            process.exit(1);
        }

        console.log('✅ Coluna adicionada com sucesso!');
        console.log('🔄 Recarregue a página do app para ver as mudanças.');

    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.log('\n📋 Execute manualmente no Supabase SQL Editor:');
        console.log(`ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));`);
    }
}

addPaymentColumn();
