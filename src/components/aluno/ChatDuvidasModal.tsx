import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';

interface ChatDuvidasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const materias = [
  'Matemática', 'Português', 'Física', 'Química', 'Biologia',
  'Geografia', 'História', 'Sociologia', 'Filosofia', 'Inglês',
  'Arte', 'Educação Física'
];

const ChatDuvidasModal = ({ isOpen, onClose }: ChatDuvidasModalProps) => {
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSelectMateria = (materia: string) => {
    setSelectedMateria(materia);
    setMessages([
      {
        text: `Olá! Sou seu assistente de ${materia}. Como posso ajudar você hoje?`,
        isUser: false,
      },
    ]);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = { text: inputValue, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        text: `Entendo sua dúvida sobre "${inputValue}". Vou explicar de forma clara: [Resposta simulada da IA aqui]. Precisa de mais ajuda?`,
        isUser: false,
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleBack = () => {
    setSelectedMateria(null);
    setMessages([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedMateria ? `Chat - ${selectedMateria}` : 'Escolha a Matéria'}
          </DialogTitle>
        </DialogHeader>

        {!selectedMateria ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
            {materias.map((materia) => (
              <Button
                key={materia}
                variant="outline"
                className="h-20 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleSelectMateria(materia)}
              >
                {materia}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="self-start mb-4"
            >
              ← Voltar
            </Button>

            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.isUser
                          ? 'bg-gradient-to-br from-primary to-primary-glow'
                          : 'bg-gradient-to-br from-secondary to-green-500'
                      }`}
                    >
                      {msg.isUser ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`flex-1 p-4 rounded-lg ${
                        msg.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua dúvida..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatDuvidasModal;
