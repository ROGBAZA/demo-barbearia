
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@latest?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log(`[Checkout] Método: ${req.method}`)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            console.error("[Checkout] Erro: STRIPE_SECRET_KEY não encontrada nas variáveis de ambiente.")
            throw new Error("Configuração do Stripe ausente no servidor.")
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        })

        const body = await req.json().catch(() => ({}))
        console.log("[Checkout] Body recebido:", JSON.stringify(body))

        const { tenantId, slug, origin, interval = 'month' } = body
        if (!tenantId) {
            throw new Error('ID da barbearia (ID do Tenant) é obrigatório.')
        }

        const baseUrl = slug ? `${origin}/t/${slug}` : origin;

        let unitAmount = 10000; // Default mensal R$ 100
        let productName = 'Plano Profissional (Mensal)';
        let productDesc = 'Assinatura Mensal - Acesso Total (7 Dias de Teste Grátis)';
        let stripeInterval = 'month';
        let intervalCount = 1;

        if (interval === 'year') {
            unitAmount = 100000; // R$ 1000
            productName = 'Plano Profissional (Anual)';
            productDesc = 'Acesso Total por 1 Ano - Economia de R$ 200';
            stripeInterval = 'year';
        } else if (interval === 'quarter') {
            unitAmount = 28000; // R$ 280
            productName = 'Plano Profissional (Trimestral)';
            productDesc = 'Acesso Total por 3 Meses - Economia de R$ 20';
            stripeInterval = 'month';
            intervalCount = 3;
        }

        console.log(`[Checkout] Iniciando sessão para Tenant ID: ${tenantId} (${interval})`)

        const sessionOptions: any = {
            payment_method_types: ['card', 'pix'],
            allow_promotion_codes: true,
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: productName,
                            description: productDesc,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: stripeInterval as 'month' | 'year',
                            interval_count: intervalCount,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            // O Stripe lida melhor com a ausência do campo trial_period_days do que com 0 ou undefined
            success_url: `${baseUrl}/configuracoes?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${baseUrl}/configuracoes?canceled=true`,
            metadata: {
                tenant_id: tenantId,
                billing_interval: interval
            },
        }

        // Adiciona trial apenas para mensal
        if (interval === 'month') {
            sessionOptions.subscription_data = {
                trial_period_days: 7
            }
        }

        const session = await stripe.checkout.sessions.create(sessionOptions)

        console.log("[Checkout] Sessão criada com sucesso:", session.id)

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error("[Checkout] Erro Crítico:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
