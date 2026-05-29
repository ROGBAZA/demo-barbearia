import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2, Phone } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useTenant } from '@/contexts/TenantContext';
import { useConfiguracoes, useServicos } from '@/hooks/useDatabase';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatBot() {
  const { tenant } = useTenant();
  const { data: config } = useConfiguracoes();
  const { data: servicos } = useServicos();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const barbeariaNome = config?.nome_barbearia || tenant?.nome || 'Route 66';
  const WHATSAPP_NUMBER = config?.telefone?.replace(/\D/g, '') || '5567998186597';
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

  useEffect(() => {
    if (barbeariaNome) {
      setMessages([
        {
          role: 'assistant',
          content: `Olá! Sou o assistente virtual da ${barbeariaNome}. Como posso ajudar você hoje? 💈`
        }
      ]);
    }
  }, [barbeariaNome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (location.pathname === '/auth' || location.pathname === '/admin') {
    return null;
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Business Context
    const context = `
      Você é o assistente virtual da barbearia ${barbeariaNome}.
      Horário: ${config?.horario_abertura || '08:00'} às ${config?.horario_fechamento || '19:00'}.
      Endereço: ${config?.endereco || 'Não informado'}.
      WhatsApp: ${config?.telefone || 'Não informado'}.
      Página de agendamento: https://client.route66.com/t/${tenant?.slug}/agendar
      
      Serviços disponíveis:
      ${servicos?.map(s => `- ${s.nome}: R$ ${s.preco}`).join('\n') || 'Consulte nossos barbeiros.'}

      Sempre seja educado, use emojis de barbearia e incentive o agendamento pelo link acima.
      Se não souber algo, direcione para o WhatsApp ${config?.telefone}.
    `;

    try {
      const response = await fetch(
        'https://xzsltthkgkoatmchixqo.supabase.co/functions/v1/ai-chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'system', content: context }, ...newMessages]
          }),
        }
      );

      if (!response.ok) throw new Error('Erro na comunicação com a IA');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Ops! Tive um problema. Por favor, chame no WhatsApp: ${config?.telefone || '(67) 99818-6597'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gold-glow z-50"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[350px] h-[500px] shadow-2xl z-50 flex flex-col bg-card border-border">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Assistente {barbeariaNome}</CardTitle>
                  <p className="text-xs text-muted-foreground">Online agora</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.filter(m => m.role !== 'system').map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                        }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* WhatsApp Link */}
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-green-500 hover:text-green-400 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Falar pelo WhatsApp: {config?.telefone || '(67) 99818-6597'}
              </a>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-background/50"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}