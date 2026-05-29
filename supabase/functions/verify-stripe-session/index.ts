
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@latest?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log(`[Verify] Método: ${req.method}`)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            console.error("[Verify] Erro: STRIPE_SECRET_KEY não encontrada.")
            throw new Error("Configuração do Stripe ausente no servidor.")
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        })

        const body = await req.json().catch(() => ({}))
        const { sessionId } = body

        if (!sessionId) {
            throw new Error('Session ID é obrigatório para verificação.')
        }

        console.log(`[Verify] Verificando sessão: ${sessionId}`)

        const session = await stripe.checkout.sessions.retrieve(sessionId)
        console.log(`[Verify] Status do pagamento: ${session.payment_status}`)

        if (session.payment_status === 'paid' || session.subscription) {
            const tenantId = session.metadata?.tenant_id

            if (!tenantId) {
                console.error("[Verify] Erro: tenant_id ausente no metadata do Stripe.")
                throw new Error('ID da barbearia não encontrado nos dados do pagamento.')
            }

            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            console.log(`[Verify] Ativando Plano Profissional para Tenant: ${tenantId}`)

            const { error: updateError } = await supabaseAdmin
                .from('tenants')
                .update({
                    plano: 'PROFISSIONAL',
                    status: 'active',
                    subscription_status: 'trialing',
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: session.subscription as string,
                    max_employees: 20
                })
                .eq('id', tenantId)

            if (updateError) {
                console.error("[Verify] Erro ao atualizar banco:", updateError)
                throw updateError
            }

            console.log("[Verify] Sucesso! Plano ativado.")
            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        return new Response(
            JSON.stringify({ success: false, message: 'O pagamento ainda não foi confirmado pelo provedor.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        console.error("[Verify] Erro Crítico:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
