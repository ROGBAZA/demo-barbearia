import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é o assistente virtual da Barbearia Route 66, uma barbearia temática inspirada na famosa rota americana. Você deve ser amigável, prestativo e profissional.

INFORMAÇÕES DA BARBEARIA:
- Nome: Barbearia Route 66
- Estilo: Barbearia temática com decoração inspirada na Route 66 americana
- Serviços: Cortes masculinos, barba, combo (corte + barba), tratamentos capilares
- WhatsApp para agendamentos: (67) 99818-6597

INSTRUÇÕES:
1. Responda sempre em português brasileiro de forma amigável
2. Se o cliente quiser agendar um horário, direcione para o WhatsApp ou para a página de agendamento online
3. Tire dúvidas sobre serviços, preços e horários
4. Se não souber responder algo específico, sugira que entre em contato pelo WhatsApp
5. Mantenha as respostas concisas mas informativas
6. Use emojis ocasionalmente para tornar a conversa mais amigável 💈✂️

EXEMPLOS DE RESPOSTAS:
- Para agendamentos: "Para agendar seu horário, você pode usar nossa página de agendamento online ou entrar em contato pelo WhatsApp (67) 99818-6597. Ficaremos felizes em atendê-lo! 📅"
- Para preços: "Nossos preços variam de acordo com o serviço. Posso informar que temos cortes a partir de R$X. Para valores atualizados, recomendo consultar nossa recepção ou WhatsApp."
- Para horários: "Nosso horário de funcionamento é de segunda a sábado. Para verificar disponibilidade específica, entre em contato conosco!"`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service is not configured');
    }

    // Prepare messages for the API - only include recent messages to save tokens
    const recentMessages = messages.slice(-10);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...recentMessages.map((msg: { role: string; content: string }) => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable.' }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      throw new Error('AI service error');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 
      'Desculpe, não consegui processar sua mensagem. Por favor, entre em contato pelo WhatsApp: (67) 99818-6597';

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process message',
        response: 'Desculpe, tive um problema ao processar sua mensagem. Por favor, entre em contato pelo WhatsApp: (67) 99818-6597'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});