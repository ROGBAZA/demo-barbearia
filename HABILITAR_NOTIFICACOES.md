# 🚀 Guia Rápido: Habilitar Notificações no Supabase

**Data:** 10/02/2026

---

## ✅ Passo 1: Executar SQL para Realtime

1. **Acesse o Supabase Dashboard:** https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Cole o seguinte SQL:

```sql
-- Habilitar Realtime para notificações
ALTER publication supabase_realtime ADD TABLE notificacoes;

-- Verificar se foi adicionado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

6. Clique em **Run** (ou pressione Ctrl+Enter)
7. ✅ Você deve ver `notificacoes` listada nos resultados

---

## ✅ Passo 2: Regenerar Tipos TypeScript

### Opção A: Via Supabase Dashboard (Mais Fácil)

1. No Supabase Dashboard, vá em **Settings** > **API**
2. Role até a seção **Types**  
3. Clique em **Generate Types**
4. Copie todo o conteúdo gerado
5. Cole no arquivo: `src/integrations/supabase/types.ts`

### Opção B: Via Supabase CLI (Recomendado)

Se você tem o Supabase CLI instalado:

```bash
# No terminal do projeto
npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts
```

---

## ✅ Passo 3: Reiniciar o Servidor

```bash
# Pare o servidor atual (Ctrl+C no terminal)
# Limpe o cache do Vite
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# Inicie novamente
npm run dev
```

---

## 🎯 Como Testar as Notificações

1. **Acesse** a aplicação logado como barbeiro/admin
2. **Olhe** o sino no header (canto superior direito)
3. **Crie** um novo agendamento para você mesmo
4. **Observe** a notificação aparecer no sino com badge
5. **Clique no sino** para ver detalhes
6. **Clique** em uma notificação para marcá-la como lida
7. **Teste** o botão "Marcar todas como lidas"

---

## 🔍 Problemas Comuns

### Erro: "Table notificacoes not found"
**Solução:** A migração `create_notifications_system.sql` não foi executada. Execute-a novamente.

### Notificações não aparecem em tempo real
**Solução:** Execute o Passo 1 (Habilitar Realtime)

### Erros de TypeScript sobre notificacoes
**Solução:** Execute o Passo 2 (Regenerar Tipos)

### Badge do sino não atualiza
**Solução:** Recarregue a página (F5) após habilitar o Realtime

---

## 🎉 Pronto!

Se tudo funcionou, você terá:
- ✅ Centro de notificações funcionando
- ✅ Badge com contagem de não lidas
- ✅ Notificações em tempo real
- ✅ Som e vibração quando chegar sua vez
- ✅ Marcação de lidas/não lidas

---

**Dúvidas?** Consulte `STATUS_IMPLEMENTACAO.md` para mais detalhes.
