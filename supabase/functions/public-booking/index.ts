import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function handleRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  return processRequest(req);
}

async function processRequest(req: Request) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor ausente' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const servico_id = body.servico_id;
    const funcionario_id = body.funcionario_id;
    const data_hora = body.data_hora;
    const cliente = body.cliente;
    const observacoes = body.observacoes;

    if (!servico_id || !funcionario_id || !data_hora || !cliente || !cliente.nome) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let clientId = null;
    if (cliente.telefone) {
      const result = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', cliente.telefone)
        .single();

      if (result.data) {
        clientId = result.data.id;
      }
    }

    if (!clientId) {
      const insertData = {
        nome: cliente.nome,
        telefone: cliente.telefone || null,
        email: cliente.email || null 
      };

      const result = await supabase
        .from('clientes')
        .insert(insertData)
        .select('id')
        .single();

      if (result.data) {
        clientId = result.data.id;
      }
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível criar cliente' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const agendamentoData = {
      cliente_id: clientId,
      servico_id: servico_id,
      funcionario_id: funcionario_id,
      data_hora: data_hora,
      status: 'agendado',
      observacoes: observacoes || null
    };

    console.log('Dados do agendamento:', agendamentoData);

    const result = await supabase
      .from('agendamentos')
      .insert(agendamentoData)
      .select(`
        *,
        cliente:clientes(id, nome, telefone, email),
        servico:servicos(id, nome, preco, duracao_minutos),
        funcionario:funcionarios(id, nome)
      `)
      .single();

    console.log('Agendamento criado:', result.data);

    return new Response(
      JSON.stringify({ success: true, agendamento: result.data }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    let errorMessage = 'Erro interno';
    if (error && error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

Deno.serve(handleRequest);
