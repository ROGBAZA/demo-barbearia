// scripts/removeDuplicateServices.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeDuplicateServices() {
  try {
    console.log('Checking for duplicate services...');

    // Get all services
    const { data: allServices, error: fetchError } = await supabase
      .from('servicos')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    console.log('Current services:', allServices?.map(s => ({ id: s.id, nome: s.nome, preco: s.preco })));

    // Find and remove "coooo" service
    const cooooServices = allServices?.filter(s => s.nome.toLowerCase().includes('coooo')) || [];
    if (cooooServices.length > 0) {
      console.log(`Found ${cooooServices.length} "coooo" service(s) to remove`);
      for (const service of cooooServices) {
        const { error: deleteError } = await supabase
          .from('servicos')
          .delete()
          .eq('id', service.id);
        
        if (deleteError) {
          console.error(`Error deleting "coooo" service ${service.id}:`, deleteError);
        } else {
          console.log(`Deleted "coooo" service: ${service.id}`);
        }
      }
    }

    // Find and remove duplicate "Barba" services (keep only the most recent one)
    const barbaServices = allServices?.filter(s => s.nome.toLowerCase().includes('barba')) || [];
    if (barbaServices.length > 1) {
      console.log(`Found ${barbaServices.length} "Barba" services, keeping the most recent one`);
      
      // Sort by created_at descending (most recent first) and keep only the first one
      const sortedBarbaServices = barbaServices.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      
      // Keep the first (most recent) and delete the rest
      const servicesToDelete = sortedBarbaServices.slice(1);
      for (const service of servicesToDelete) {
        const { error: deleteError } = await supabase
          .from('servicos')
          .delete()
          .eq('id', service.id);
        
        if (deleteError) {
          console.error(`Error deleting duplicate "Barba" service ${service.id}:`, deleteError);
        } else {
          console.log(`Deleted duplicate "Barba" service: ${service.id} (R$ ${service.preco})`);
        }
      }
      
      console.log(`Kept "Barba" service: ${sortedBarbaServices[0].id} (R$ ${sortedBarbaServices[0].preco})`);
    }

    // Show final services
    const { data: finalServices, error: finalFetchError } = await supabase
      .from('servicos')
      .select('*')
      .order('nome');

    if (finalFetchError) throw finalFetchError;

    console.log('\nFinal services after cleanup:');
    finalServices?.forEach(service => {
      console.log(`- ${service.nome}: R$ ${service.preco} (${service.id})`);
    });

    console.log('\nCleanup completed successfully!');

  } catch (error) {
    console.error('Error removing duplicate services:', error);
  }
}

removeDuplicateServices();
