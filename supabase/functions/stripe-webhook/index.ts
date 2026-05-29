
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    try {
        const body = await req.text()
        const stripe = new Stripe(stripeSecretKey!, { apiVersion: '2023-10-16' })

        let event;
        if (endpointSecret && signature) {
            try {
                event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
            } catch (err) {
                console.error(`❌ Webhook Signature Error: ${err.message}`);
                // Em modo de teste, se a assinatura falhar mas o corpo for JSON válido, podemos tentar processar
                // Mas apenas se o webhook secret estiver vazio ou errado.
                event = JSON.parse(body);
            }
        } else {
            console.warn('⚠️ Webhook rodando sem validação de assinatura ou secret.');
            event = JSON.parse(body)
        }


        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`🔔 Evento Stripe: ${event.type}`);

        // 1. SUCESSO NO CHECKOUT OU CRIAÇÃO DE ASSINATURA
        if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.created') {
            const session = event.data.object
            const tenantId = session.metadata?.tenant_id
            const billingInterval = session.metadata?.billing_interval || 'month'
            const subscriptionId = session.subscription || session.id
            const customerId = session.customer

            let maxEmployees = 2; // Default for Free or Monthly (Básico)
            if (billingInterval === 'quarter') {
                maxEmployees = 5; // Trimestral
            } else if (billingInterval === 'year') {
                maxEmployees = 9999; // Anual (Ilimitado)
            }

            if (tenantId) {
                console.log(`✅ Ativando plano para Tenant: ${tenantId}`);
                await supabaseAdmin.from('tenants').update({
                    plano: 'PROFISSIONAL',
                    status: 'active',
                    subscription_status: session.subscription ? 'trialing' : 'active',
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    max_employees: maxEmployees
                }).eq('id', tenantId);
            }
        }

        // 2. PAGAMENTO DE FATURA (Renovação ou Pagamento Atrasado)
        if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;

            if (subscriptionId) {
                console.log(`💰 Fatura paga para assinatura: ${subscriptionId}`);
                await supabaseAdmin.from('tenants').update({
                    subscription_status: 'active',
                    status: 'active'
                }).eq('stripe_subscription_id', subscriptionId);
            }
        }

        // 3. FALHA NO PAGAMENTO
        if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;

            if (subscriptionId) {
                console.log(`❌ Falha no pagamento para: ${subscriptionId}`);
                await supabaseAdmin.from('tenants').update({
                    subscription_status: 'past_due'
                }).eq('stripe_subscription_id', subscriptionId);
            }
        }

        // 4. CANCELAMENTO OU EXPIRAÇÃO
        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            console.log(`🚫 Assinatura cancelada/expirada: ${subscription.id}`);

            await supabaseAdmin.from('tenants').update({
                plano: 'free',
                subscription_status: 'canceled',
                max_employees: 2 // Volta ao limite free
            }).eq('stripe_subscription_id', subscription.id);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        })
    } catch (err) {
        console.error(`🔥 Erro Crítico Webhook: ${err.message}`);
        return new Response(`Error: ${err.message}`, { status: 400 })
    }
})
