# 📝 LOG DE MUDANÇAS - ISOLAMENTO MULTI-TENANT

**Data:** 04/02/2026  
**Versão:** 2.0  
**Tipo:** Correção Crítica de Segurança

---

## 🔴 MUDANÇAS CRÍTICAS (BREAKING CHANGES)

### 1. Banco de Dados - Função `current_funcionario_id()`

**Arquivo:** Supabase Database  
**Tipo:** SQL Function  
**Prioridade:** 🔴 CRÍTICA

**Antes:**
```sql
CREATE OR REPLACE FUNCTION current_funcionario_id()
RETURNS uuid AS $$
  SELECT id FROM public.funcionarios 
  WHERE user_id = auth.uid() AND ativo = true;
$$;
```

**Depois:**
```sql
CREATE OR REPLACE FUNCTION current_funcionario_id()
RETURNS uuid AS $$
  SELECT id FROM public.funcionarios 
  WHERE user_id = auth.uid() 
  AND ativo = true
  AND tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  LIMIT 1;
$$;
```

**Motivo:** Funcionários podiam acessar dados de outras barbearias.  
**Impacto:** 🔴 Alto - Segurança crítica  
**Rollback:** Não recomendado - vulnerabilidade de segurança

---

### 2. Edge Function - admin-create-user

**Arquivo:** `supabase/functions/admin-create-user/index.ts`  
**Linhas:** 26, 40-44  
**Prioridade:** 🔴 CRÍTICA

**Mudanças:**
```diff
- const { email, password, nome, cargo, nivel_acesso } = body
+ const { email, password, nome, cargo, nivel_acesso, tenant_id } = body

  const metadata = {
      nome,
      cargo,
-     nivel_acesso
+     nivel_acesso,
+     tenant_id
  };
```

**Motivo:** Funcionários criados não eram vinculados ao tenant.  
**Impacto:** 🔴 Alto - Funcionários sem acesso correto  
**Rollback:** Não recomendado - quebra autenticação

---

### 3. Banco de Dados - Função get_public_barbeiros

**Arquivo:** Supabase Database  
**Tipo:** SQL Function  
**Prioridade:** 🔴 CRÍTICA

**Antes:**
```sql
CREATE OR REPLACE FUNCTION get_public_barbeiros()
RETURNS TABLE (...) AS $$
  SELECT * FROM funcionarios 
  WHERE cargo = 'barbeiro' AND ativo = true;
$$;
```

**Depois:**
```sql
CREATE OR REPLACE FUNCTION get_public_barbeiros(t_id uuid)
RETURNS TABLE (...) AS $$
  SELECT * FROM funcionarios 
  WHERE cargo = 'barbeiro' 
  AND ativo = true
  AND tenant_id = t_id;
$$;
```

**Motivo:** Agendamento público mostrava barbeiros de todas as barbearias.  
**Impacto:** 🔴 Alto - Confusão para clientes  
**Rollback:** Não recomendado - experiência do usuário ruim

---

## 🟡 MUDANÇAS IMPORTANTES

### 4. Frontend - useCreateFuncionario

**Arquivo:** `src/hooks/useDatabase.ts`  
**Linhas:** 869-885  
**Prioridade:** 🟡 IMPORTANTE

**Adicionado:**
```typescript
// Verificar se o e-mail já está em uso em OUTRO tenant
const { data: existingOtherTenant } = await supabase
  .from('funcionarios')
  .select('tenant_id, nome')
  .eq('email', funcionarioData.email)
  .neq('tenant_id', tenant.id)
  .maybeSingle();

if (existingOtherTenant) {
  throw new Error('Este e-mail já está sendo usado em outra unidade.');
}
```

**Motivo:** Prevenir conflitos de email entre barbearias.  
**Impacto:** 🟡 Médio - Melhoria de UX  
**Rollback:** Seguro - apenas validação extra

---

### 5. Frontend - AgendamentoPublico

**Arquivo:** `src/pages/AgendamentoPublico.tsx`  
**Linhas:** 119-128  
**Prioridade:** 🟡 IMPORTANTE

**Mudanças:**
```diff
  const { data: barbeiros } = useQuery({
-   queryKey: ['barbeiros-public'],
+   queryKey: ['barbeiros-public', tenant?.id],
    queryFn: async () => {
+     if (!tenant?.id) return [];
-     const { data } = await supabase.rpc('get_public_barbeiros');
+     const { data } = await supabase.rpc('get_public_barbeiros', { t_id: tenant.id });
      return data as Barbeiro[];
    },
+   enabled: !!tenant?.id
  });
```

**Motivo:** Passar tenant_id para filtrar barbeiros.  
**Impacto:** 🟡 Médio - Funcionalidade correta  
**Rollback:** Não recomendado - quebra agendamento público

---

### 6. Frontend - useDatabase (tenant_id no admin-create-user)

**Arquivo:** `src/hooks/useDatabase.ts`  
**Linhas:** 840-847  
**Prioridade:** 🟡 IMPORTANTE

**Mudanças:**
```diff
  const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email: funcionarioData.email,
      password: password,
      nome: funcionarioData.nome,
      cargo: funcionarioData.cargo,
      // ...
      nivel_acesso: funcionarioData.nivel_acesso,
+     tenant_id: tenant.id
    }
  });
```

**Motivo:** Enviar tenant_id para a Edge Function.  
**Impacto:** 🟡 Médio - Vinculação correta  
**Rollback:** Não recomendado - quebra criação de funcionários

---

## 🟢 MUDANÇAS MENORES

### 7. Frontend - Import Scissors

**Arquivo:** `src/pages/Funcionarios.tsx`  
**Prioridade:** 🟢 MENOR

**Motivo:** Corrigir erro `ReferenceError: Scissors is not defined`.  
**Impacto:** 🟢 Baixo - Correção de bug visual  
**Rollback:** Seguro - apenas import faltante

---

## 🛡️ POLÍTICAS RLS ADICIONADAS/MODIFICADAS

### 8. Políticas de Isolamento por Tenant

**Tabelas Afetadas:** 10 tabelas  
**Prioridade:** 🔴 CRÍTICA

**Motivo:** Garantir isolamento total entre barbearias.  
**Impacto:** 🔴 Alto - Segurança fundamental  
**Rollback:** NÃO PERMITIDO - vulnerabilidade crítica

---

## 📅 ATUALIZAÇÃO v2.1 (05/02/2026 09:50)

### 9. Isolamento Definitivo de Sessão (LocalStorage Removal)

**Arquivo:** `src/contexts/TenantContext.tsx`
**Prioridade:** 🔴 CRÍTICA

- **Removido:** Fallback de `localStorage` para resolução de Tenant ID.
- **Implementado:** Priorização estrita de `User Metadata` ou `User Roles` para acesso admin.
- **Motivo:** O uso do cache local permitia que sessões antigas contaminassem o login de novos usuários em computadores compartilhados.

### 10. Blindagem de Queries de Mutação

**Arquivo:** `src/hooks/useDatabase.ts`
**Prioridade:** 🔴 CRÍTICA

- **Adicionado:** `tenant_id` check obrigatório (`.eq('tenant_id', tenant.id)`) em todas as operações de `UPDATE` e `DELETE`.
- **Hooks Afetados:** `useUpdateAgendamento`, `useDeleteAgendamento`, `useUpdatePlano`, `useDeletePlano`.
- **Motivo:** Camada extra de defesa em profundidade caso o contexto frontend falhe.

### 11. Correção de Erro de Sintaxe (Hotfix)
- Corrigido bloco de código duplicado no `useDatabase.ts` que quebrava o build.

---

**Status Final:** ✅ **Isolamento de Dados Garantido**
