import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let body;
        try {
            body = await req.json()
        } catch (e) {
            throw new Error('Request body must be valid JSON')
        }

        const { email, password, nome, cargo, nivel_acesso, tenant_id } = body

        if (!email || !password || !tenant_id) {
            throw new Error('Email, senha e tenant_id são obrigatórios')
        }

        let userData;

        // Check if user exists in Auth
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) throw listError;

        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        const metadata = {
            nome,
            cargo,
            nivel_acesso,
            tenant_id,
            role: nivel_acesso === 'administrador' ? 'admin' : (nivel_acesso === 'recepcionista' ? 'recepcionista' : 'funcionario')
        };

        if (existingUser) {
            console.log('Updating existing user:', existingUser.id);
            const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                {
                    password: password,
                    user_metadata: metadata,
                    email_confirm: true
                }
            )
            if (updateError) throw updateError;
            userData = updated.user;
        } else {
            console.log('Creating new user');
            const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            })
            if (createError) throw createError;
            userData = created.user;
        }

        // Atomic Sync: Ensure DB tables are updated
        // 1. User Roles
        await supabaseAdmin
            .from('user_roles')
            .upsert({
                user_id: userData.id,
                tenant_id: tenant_id,
                role: metadata.role
            }, { onConflict: 'user_id' });

        // 2. Funcionarios
        await supabaseAdmin
            .from('funcionarios')
            .upsert({
                user_id: userData.id,
                tenant_id: tenant_id,
                nome: nome,
                email: email,
                cargo: cargo,
                nivel_acesso: nivel_acesso,
                ativo: true
            }, { onConflict: 'email' });

        return new Response(JSON.stringify({ user: userData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Edge Function Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

