// scripts/checkServices.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkServices() {
  try {
    // Get all services from database
    const { data: dbServices, error: fetchError } = await supabase
      .from('servicos')
      .select('*')
      .order('nome');

    if (fetchError) throw fetchError;

    console.log('=== SERVIÇOS NO BANCO DE DADOS ===');
    dbServices?.forEach(service => {
      console.log(`- ${service.nome}: R$ ${service.preco}`);
    });

    // Services defined in config file
    const configServices = [
      'Corte Masculino',
      'Barba', 
      'Corte + Barba',
      'Sobrancelha',
      'Platinado',
      'Progressiva', 
      'Hidratação',
      'Pigmentação',
      'Corte Degradê',
      'Tratamento de Barba',
      'Corte de Cabelo Masculino'
    ];

    console.log('\n=== SERVIÇOS NO CONFIG ===');
    configServices.forEach(service => {
      console.log(`- ${service}`);
    });

    // Find services in config but not in database
    const dbServiceNames = dbServices?.map(s => s.nome) || [];
    const missingInDb = configServices.filter(service => 
      !dbServiceNames.includes(service)
    );

    console.log('\n=== SERVIÇOS FALTANDO NO BANCO ===');
    if (missingInDb.length > 0) {
      missingInDb.forEach(service => {
        console.log(`- ${service} (definido no config mas não no banco)`);
      });
    } else {
      console.log('Nenhum serviço faltando');
    }

    // Find services in database but not in config
    const extraInDb = dbServiceNames.filter(service => 
      !configServices.includes(service)
    );

    console.log('\n=== SERVIÇOS EXTRAS NO BANCO ===');
    if (extraInDb.length > 0) {
      extraInDb.forEach(service => {
        console.log(`- ${service} (no banco mas não no config)`);
      });
    } else {
      console.log('Nenhum serviço extra');
    }

  } catch (error) {
    console.error('Error checking services:', error);
  }
}

checkServices();
