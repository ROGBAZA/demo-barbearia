# 🚀 GUIA RÁPIDO DE TESTE - ISOLAMENTO MULTI-TENANT

## ⚡ TESTE RÁPIDO (5 minutos)

### 1️⃣ Teste de Funcionário (MAIS IMPORTANTE)

**Objetivo:** Verificar se funcionários veem apenas dados da própria barbearia

**Passos:**
```
1. Abra o navegador em modo anônimo
2. Acesse: https://seu-dominio.com/t/barber-route-66
3. Faça login como admin da "Barber Route 66"
4. Vá em "Equipe" e crie um novo funcionário:
   - Nome: Teste Isolamento
   - Email: teste@route66.com
   - Senha: teste123456
   - Cargo: Barbeiro
5. Faça logout
6. Faça login com teste@route66.com
7. ✅ VERIFICAR: Você vê apenas dados da "Barber Route 66"
8. Tente acessar: https://seu-dominio.com/t/zelove-barber
9. ✅ VERIFICAR: Sistema redireciona ou mostra apenas dados da Route 66
```

**✅ Passou?** Isolamento está funcionando!  
**❌ Falhou?** Execute o script `validate_isolation.sql` e reporte o erro.

---

### 2️⃣ Teste de Agendamento Público

**Objetivo:** Verificar se apenas barbeiros da barbearia aparecem

**Passos:**
```
1. Abra uma nova janela anônima
2. Acesse: https://seu-dominio.com/t/zelove-barber/agendar
3. ✅ VERIFICAR: Apenas barbeiros da "Zelove-barber" aparecem
4. Faça um agendamento de teste
5. Faça login como admin da "Zelove-barber"
6. ✅ VERIFICAR: Agendamento aparece na lista
7. Faça login como admin da "Barber Route 66"
8. ✅ VERIFICAR: Agendamento NÃO aparece
```

**✅ Passou?** Agendamento público isolado!  
**❌ Falhou?** Verifique se a função `get_public_barbeiros` foi atualizada.

---

### 3️⃣ Teste de Configurações

**Objetivo:** Verificar se mudanças visuais não afetam outras barbearias

**Passos:**
```
1. Faça login como admin da "Vitoriano"
2. Vá em "Configurações" > "Identidade Visual"
3. Mude a cor primária para #FF0000 (vermelho)
4. Salve
5. ✅ VERIFICAR: Interface ficou vermelha
6. Abra nova janela anônima
7. Acesse: https://seu-dominio.com/t/barber-route-66
8. ✅ VERIFICAR: Cor continua a original (não mudou para vermelho)
```

**✅ Passou?** Configurações isoladas!  
**❌ Falhou?** Verifique o `TenantContext.tsx`.

---

## 🔍 VERIFICAÇÃO RÁPIDA NO CONSOLE

Abra o console do navegador (F12) e execute:

```javascript
// Verificar tenant atual
const { data } = await supabase.auth.getSession();
console.log('🏢 Tenant ID:', data.session?.user?.user_metadata?.tenant_id);
console.log('👤 User ID:', data.session?.user?.id);
console.log('📧 Email:', data.session?.user?.email);

// Verificar se consegue ver dados de outro tenant (NÃO DEVERIA)
const { data: outros, error } = await supabase
  .from('clientes')
  .select('*')
  .limit(10);

console.log('📊 Clientes visíveis:', outros?.length);
console.log('⚠️ Erro (esperado se RLS funcionando):', error);
```

**Resultado Esperado:**
- ✅ Tenant ID deve estar preenchido
- ✅ Clientes visíveis deve ser apenas do seu tenant
- ✅ Se tentar filtrar por outro tenant_id, deve dar erro ou retornar vazio

---

## 🎯 CHECKLIST RÁPIDO

Marque conforme testa:

- [ ] **Funcionários isolados** - Login mostra apenas dados da própria barbearia
- [ ] **Clientes isolados** - Cada barbearia vê apenas seus clientes
- [ ] **Serviços isolados** - Serviços não aparecem em outras barbearias
- [ ] **Agendamentos isolados** - Agendamentos não cruzam entre barbearias
- [ ] **Configurações isoladas** - Cores/logos não afetam outras barbearias
- [ ] **Agendamento público** - Mostra apenas barbeiros da barbearia correta
- [ ] **Fila de espera isolada** - Fila não cruza entre barbearias

---

## 🚨 SE ALGO FALHAR

### Passo 1: Capture Informações
```javascript
// No console do navegador
console.log('URL atual:', window.location.href);
console.log('Tenant do localStorage:', localStorage.getItem('tenant'));

const { data } = await supabase.auth.getSession();
console.log('Tenant do JWT:', data.session?.user?.user_metadata?.tenant_id);
```

### Passo 2: Execute Validação SQL
No Supabase SQL Editor, execute:
```sql
-- Verificar se RLS está ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clientes', 'funcionarios', 'servicos', 'agendamentos');

-- Verificar se há dados sem tenant_id
SELECT 
    'clientes' as tabela, COUNT(*) as sem_tenant
FROM clientes WHERE tenant_id IS NULL
UNION ALL
SELECT 'funcionarios', COUNT(*) FROM funcionarios WHERE tenant_id IS NULL
UNION ALL
SELECT 'servicos', COUNT(*) FROM servicos WHERE tenant_id IS NULL;
```

### Passo 3: Reporte o Problema
Envie:
1. Screenshot do erro
2. URL que estava acessando
3. Resultado dos comandos acima
4. Qual teste falhou

---

## ✅ TUDO FUNCIONANDO?

Se todos os testes passaram:
1. ✅ Sistema está seguro
2. ✅ Pode usar em produção
3. ✅ Treine os admins
4. ✅ Configure monitoramento

---

## 📚 DOCUMENTOS RELACIONADOS

- `RELATORIO_ISOLAMENTO_COMPLETO.md` - Relatório técnico detalhado
- `CHECKLIST_ISOLAMENTO.md` - Checklist completo de testes
- `RESUMO_EXECUTIVO.md` - Resumo executivo
- `validate_isolation.sql` - Script de validação SQL

---

**⏱️ Tempo estimado:** 5-10 minutos  
**🎯 Objetivo:** Validar isolamento básico  
**✅ Sucesso:** Todos os testes passam  
**📅 Próxima validação:** Semanal
