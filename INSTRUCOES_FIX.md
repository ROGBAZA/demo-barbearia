# Como Corrigir Serviços Duplicados e Adicionar Imagens

## Passos para resolver o problema:

1. **Execute o script SQL principal:**
   ```bash
   npx supabase db shell --file fix_services_final.sql
   ```

2. **O que o script faz:**
   - Remove serviços duplicados (mantendo apenas o mais recente)
   - Adiciona colunas de imagem, descrição e categoria se não existirem
   - Atualiza todos os serviços com imagens de alta qualidade
   - Insere serviços que podem estar faltando
   - Mostra o resultado final com status das imagens

3. **Verifique o resultado:**
   - Todos os serviços devem ter imagem_url preenchida
   - Não deve haver serviços duplicados
   - Cada serviço deve ter categoria e descrição

4. **Se ainda houver problemas:**
   - Verifique o console do aplicativo para erros
   - Recarregue a página para ver as atualizações
   - Os serviços agora devem aparecer sem duplicatas e com imagens

## Arquivos modificados:
- `fix_services_final.sql` - Script SQL completo
- `src/config/servicosImagens.ts` - Configuração de imagens atualizada
