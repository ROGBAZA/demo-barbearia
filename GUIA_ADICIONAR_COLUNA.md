# 🔥 GUIA EMERGENCIAL - Como Adicionar a Coluna no Supabase

## ⚡ MÉTODO 1: SQL Editor (RECOMENDADO - 2 minutos)

### Passo 1: Abra o Supabase
1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Selecione seu projeto (demo-barbearia)

### Passo 2: Vá para o SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New Query"** (ou use o botão "+")

### Passo 3: Cole este código SQL
```sql
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' 
CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));

COMMENT ON COLUMN agendamentos.metodo_pagamento IS 'Payment method used for the appointment: dinheiro (cash), pix, or cartao (card)';
```

### Passo 4: Execute
1. Clique no botão **"RUN"** (canto inferior direito)
2. Aguarde a confirmação: "Success. No rows returned"

### Passo 5: Recarregue o App
1. Volte para a página da fila de espera
2. Pressione **Ctrl + Shift + R** (hard reload)
3. O erro deve desaparecer

---

## ⚡ MÉTODO 2: Via Node.js (Alternativa - se tiver Service Role Key)

```bash
node add-payment-column.js
```

**Nota:** Requer `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env`

---

## ✅ Como Verificar se Funcionou

1. Abra o Supabase Dashboard
2. Vá em **Table Editor** → **agendamentos**
3. Veja se aparece a coluna **`metodo_pagamento`** na lista de colunas
4. Se aparecer, está pronto! Recarregue o app.

---

## 🆘 Se o Erro Persistir

1. Limpe o cache do navegador:
   - Chrome: **Ctrl + Shift + Del** → Limpar tudo
   - Edge: **Ctrl + Shift + Del** → Limpar tudo

2. Reinicie o servidor de desenvolvimento:
   ```bash
   # No terminal onde o npm run dev está rodando:
   Ctrl + C
   npm run dev
   ```

3. Aguarde 30 segundos (cache do Supabase)

---

## 📞 AINDA COM PROBLEMAS?

O app **JÁ ESTÁ PREPARADO** para funcionar mesmo sem a coluna `metodo_pagamento`.

- ✅ Você pode finalizar atendimentos normalmente
- ✅ O pagamento será salvo como "dinheiro" por padrão
- ✅ Depois você adiciona a coluna e tudo funcionará 100%

**A funcionalidade crítica (concluir serviços) está garantida!**
