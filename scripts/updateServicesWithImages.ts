// scripts/updateServicesWithImages.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service data with images and descriptions
const servicos = [
  {
    nome: "Corte de Cabelo",
    descricao: "Corte de cabelo personalizado com as melhores técnicas para valorizar seu estilo.",
    imagem_url: "/images/servicos/corte-cabelo.jpg",
    preco: 50.00,
    duracao_minutos: 30,
    ativo: true
  },
  {
    nome: "Barba",
    descricao: "Barba feita com navalha, toalha quente e produtos de qualidade para um acabamento perfeito.",
    imagem_url: "/images/servicos/barba.jpg",
    preco: 35.00,
    duracao_minutos: 30,
    ativo: true
  },
  {
    nome: "Corte + Barba",
    descricao: "Pacote completo com corte de cabelo e barba para você sair renovado.",
    imagem_url: "/images/servicos/corte-barba.jpg",
    preco: 75.00,
    duracao_minutos: 60,
    ativo: true
  },
  {
    nome: "Sobrancelha",
    descricao: "Desenho e manutenção de sobrancelhas para valorizar seu olhar.",
    imagem_url: "/images/servicos/sobrancelha.jpg",
    preco: 25.00,
    duracao_minutos: 20,
    ativo: true
  },
  {
    nome: "Hidratação",
    descricao: "Tratamento hidratante profundo para cabelos ressecados e danificados.",
    imagem_url: "/images/servicos/hidratacao.jpg",
    preco: 60.00,
    duracao_minutos: 40,
    ativo: true
  },
  {
    nome: "Progressiva",
    descricao: "Tratamento para alisar e reduzir o volume dos fios, deixando-os mais maleáveis.",
    imagem_url: "/images/servicos/progressiva.jpg",
    preco: 120.00,
    duracao_minutos: 120,
    ativo: true
  }
];

async function updateServices() {
  try {
    // First, get all existing services
    const { data: existingServices, error: fetchError } = await supabase
      .from('servicos')
      .select('*');

    if (fetchError) throw fetchError;

    // Update or create each service
    for (const service of servicos) {
      const existingService = existingServices?.find(s => s.nome === service.nome);
      
      if (existingService) {
        // Update existing service
        const { error: updateError } = await supabase
          .from('servicos')
          .update({
            descricao: service.descricao,
            imagem_url: service.imagem_url,
            preco: service.preco,
            duracao_minutos: service.duracao_minutos,
            ativo: service.ativo
          })
          .eq('id', existingService.id);

        if (updateError) {
          console.error(`Error updating service ${service.nome}:`, updateError);
        } else {
          console.log(`Updated service: ${service.nome}`);
        }
      } else {
        // Create new service
        const { error: insertError } = await supabase
          .from('servicos')
          .insert([service]);

        if (insertError) {
          console.error(`Error creating service ${service.nome}:`, insertError);
        } else {
          console.log(`Created service: ${service.nome}`);
        }
      }
    }

    console.log('All services have been updated successfully!');
  } catch (error) {
    console.error('Error updating services:', error);
  }
}

updateServices();
