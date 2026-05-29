import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Check } from 'lucide-react';
import { Servico } from '@/types';
import { getImagemServico } from '@/config/servicosImagens';

interface ServiceCardsProps {
  servicos: Servico[];
  selectedServico: string;
  onSelectServico: (id: string) => void;
}

export function ServiceCards({ servicos, selectedServico, onSelectServico }: ServiceCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {servicos.map(servico => {
        // Usa imagem do banco se existir, senão usa uma genérica
        // Se não tiver imagem no barco, usa a lógica inteligente do getImagemServico
        // que busca correspondência ou retorna o neutro
        const imagemConfig = getImagemServico(servico.nome);
        const imagemUrl = servico.imagem_url || imagemConfig.url;
        const categoria = servico.categoria || imagemConfig.categoria;
        const descricao = servico.descricao || imagemConfig.descricao;

        return (
          <Card
            key={servico.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${selectedServico === servico.id
              ? 'ring-2 ring-primary bg-primary/5'
              : 'hover:bg-accent'
              }`}
            onClick={() => onSelectServico(servico.id)}
          >
            <CardContent className="p-0">
              <div className="relative">
                {/* Imagem do serviço */}
                <div className="h-48 bg-cover bg-center rounded-t-lg" style={{ backgroundImage: `url(${imagemUrl})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-t-lg" />
                </div>

                {/* Badge de seleção */}
                {selectedServico === servico.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}

                {/* Categoria */}
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    {categoria}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{servico.nome}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{descricao}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{servico.duracao_minutos} min</span>
                  </div>

                  <Badge variant="outline" className="text-base px-3 py-1">
                    R$ {Number(servico.preco).toFixed(2)}
                  </Badge>
                </div>

                <Button
                  className="w-full"
                  variant={selectedServico === servico.id ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectServico(servico.id);
                  }}
                >
                  {selectedServico === servico.id ? "Selecionado" : "Selecionar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
