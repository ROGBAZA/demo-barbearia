# Como Alterar as Imagens dos Serviços

## Opção 1: Alterar no Código (Recomendado)

### Arquivo: `src/config/servicosImagens.ts`

Este arquivo contém todas as configurações de imagens dos serviços. Para alterar:

1. Abra o arquivo `src/config/servicosImagens.ts`
2. Localize o serviço que deseja alterar
3. Substitua o `url` da imagem pelo novo link

**Exemplo:**
```typescript
'Corte Masculino': {
  url: 'https://SEU_NOVO_LINK_DA_IMAGEM_AQUI',  // ← Altere aqui
  descricao: 'Corte de cabelo masculino tradicional',
  categoria: 'corte'
},
```

## Opção 2: Alterar no Banco de Dados

### Via Supabase Dashboard

1. Acesse o painel do Supabase
2. Vá para "Table Editor"
3. Selecione a tabela `servicos`
4. Localize o serviço desejado
5. Altere o campo `imagem_url` com o novo link

### Via SQL

Execute o SQL no Editor SQL do Supabase:

```sql
UPDATE public.servicos 
SET imagem_url = 'https://SEU_NOVO_LINK_DA_IMAGEM_AQUI'
WHERE nome = 'Nome do Serviço';
```

## Onde Encontrar Imagens

### Sites Recomendados:
- **Unsplash**: https://unsplash.com (grátis, alta qualidade)
- **Pexels**: https://pexels.com (grátis, alta qualidade)
- **Pixabay**: https://pixabay.com (grátis, variado)

### Formato Recomendado:
- **Dimensões**: 400x300 pixels (ou proporção 4:3)
- **Formato**: JPG ou PNG
- **Tamanho**: Menos de 500KB

## Para Remover Serviços Duplicados

Execute o script `remove_servicos_duplicados.sql` no Supabase:

1. Abra o Editor SQL do Supabase
2. Copie e cole o conteúdo do arquivo
3. Execute o script

## Solução de Problemas

### Imagens Aparecendo Pretas:
1. Verifique se o link da imagem está acessível
2. Teste o link diretamente no navegador
3. Use links HTTPS (não HTTP)

### Serviços Repetidos:
1. Execute o script de remoção de duplicados
2. Verifique se há serviços com nomes similares
3. Padronize os nomes dos serviços

## Exemplo de Links de Imagens

Você pode usar estes links como exemplo:

```typescript
'Corte Masculino': 'https://images.unsplash.com/photo-1503951914875-aa227a94f3c2?w=400&h=300&fit=crop&crop=face',
'Barba': 'https://images.unsplash.com/photo-1581349533516-53887d42a6a1?w=400&h=300&fit=crop&crop=face',
'Corte + Barba': 'https://images.unsplash.com/photo-1517891905240-472988babdf9?w=400&h=300&fit=crop&crop=face',
```

## Dicas Finais

- Use imagens que representem bem o serviço
- Mantenha um estilo visual consistente
- Prefira imagens com boa iluminação
- Teste sempre os links antes de salvar
