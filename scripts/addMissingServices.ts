// scripts/addMissingServices.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addMissingServices() {
  const missingServices = [
    { nome: 'Barba', preco: 25.00, duracao_minutos: 30 },
    { nome: 'Corte + Barba', preco: 50.00, duracao_minutos: 60 },
    { nome: 'Platinado', preco: 120.00, duracao_minutos: 120 },
    { nome: 'Progressiva', preco: 100.00, duracao_minutos: 90 },
    { nome: 'Hidratação', preco: 60.00, duracao_minutos: 40 },
    { nome: 'Pigmentação', preco: 80.00, duracao_minutos: 60 }
  ];

  for (const service of missingServices) {
    const { error } = await supabase
      .from('servicos')
      .insert([service]);

    if (error) {
      console.error('Erro ao adicionar', service.nome, ':', error);
    } else {
      console.log('Adicionado:', service.nome);
    }
  }
}

addMissingServices();
