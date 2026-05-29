import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Star, Clock, Check } from 'lucide-react';
import { Barbeiro } from '@/types';

interface ProfessionalCardsProps {
    barbeiros: Barbeiro[];
    selectedBarbeiro: string;
    onSelectBarbeiro: (id: string) => void;
}

interface ProfessionalCardItemProps {
    barbeiro: Barbeiro;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

function ProfessionalCardItem({ barbeiro, isSelected, onSelect }: ProfessionalCardItemProps) {
    const [imgError, setImgError] = React.useState(false);

    return (
        <Card
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl group h-full ${isSelected
                ? 'ring-2 ring-primary bg-primary/5 border-primary'
                : 'hover:bg-accent/50 border-primary/10'
                }`}
            onClick={() => onSelect(barbeiro.id)}
        >
            <CardContent className="p-0 h-full flex flex-col">
                {/* Cabeçalho do Card com Imagem */}
                <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0">
                    {barbeiro.foto_url && !imgError ? (
                        <img
                            src={barbeiro.foto_url}
                            alt={barbeiro.nome}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/5">
                            <User className="h-16 w-16 text-primary/40" />
                            {imgError && <span className="text-[10px] text-muted-foreground mt-2">Imagem indisponível</span>}
                        </div>
                    )}

                    {/* Badge de Seleção */}
                    {isSelected && (
                        <div className="absolute top-3 right-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                                <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                        </div>
                    )}

                    {/* Overlay de Cargo */}
                    <div className="absolute bottom-3 left-3">
                        <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm border-none capitalize">
                            {barbeiro.cargo}
                        </Badge>
                    </div>
                </div>

                {/* Informações */}
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                {barbeiro.nome}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                ))}
                                <span className="text-[10px] text-muted-foreground ml-1">(4.9)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1 flex-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary/70" />
                            <span>{barbeiro.horario_inicio.substring(0, 5)} - {barbeiro.horario_fim.substring(0, 5)}</span>
                        </div>
                    </div>

                    <Button
                        className="w-full mt-auto group-hover:shadow-md"
                        variant={isSelected ? "default" : "outline"}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(barbeiro.id);
                        }}
                    >
                        {isSelected ? "Selecionado" : "Ver Agenda"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function ProfessionalCards({ barbeiros, selectedBarbeiro, onSelectBarbeiro }: ProfessionalCardsProps) {
    return (
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl mx-auto px-4">
            {barbeiros.map(barbeiro => (
                <div key={barbeiro.id} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] min-w-[260px]">
                    <ProfessionalCardItem
                        barbeiro={barbeiro}
                        isSelected={selectedBarbeiro === barbeiro.id}
                        onSelect={onSelectBarbeiro}
                    />
                </div>
            ))}
        </div>
    );
}
