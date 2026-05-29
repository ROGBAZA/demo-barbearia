import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "https://esm.sh/web-push@3.6.6";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BE7DoYNMx2nHqJqb2MbpUTCdwjuUHMgudomZdA7C15XKNbakZjB5neFrc8c26uvm0K6b0Yee0SV6IQKc7zIy9q4";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "Ta2YO_ajQabhvPZoLGrlk3X_lREaXxyEWBcV_9vQ-v8";

webpush.setVapidDetails(
    "mailto:contato@route66barbearia.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

serve(async (req) => {
    try {
        const { record } = await req.json();

        if (record.status === 'chamado' && record.push_subscription) {
            // Payload minimalista
            const payload = JSON.stringify({
                title: "⚠️ SUA VEZ CHEGOU! ✂️",
                body: `O barbeiro está te esperando, ${record.nome}! Dirija-se ao local IMEDIATAMENTE.`,
                url: `/fila-posicao?id=${record.id}`
            });

            console.log(`🚀 DISPARANDO ALERTA CRÍTICO PARA: ${record.nome}`);

            await webpush.sendNotification(
                record.push_subscription,
                payload,
                {
                    TTL: 0,
                    urgency: 'high', // ESSENCIAL para tentar acordar o celular
                    topic: 'emergency'
                }
            );

            console.log(`✅ Push enviado com sucesso.`);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("❌ Erro no Push:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
