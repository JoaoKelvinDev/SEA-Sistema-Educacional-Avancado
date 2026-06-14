import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Atividade } from '@/types';
import { useData } from '@/contexts/DataContext';
import Header from '@/components/shared/Header';

interface ResolverAtividadeCardProps {
  atividade: Atividade;
  alunoId: string;
  onClose: () => void;
}

const ResolverAtividadeCard = ({ atividade, alunoId, onClose }: ResolverAtividadeCardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respostas, setRespostas] = useState<{ [key: string]: string }>({});
  const { addResposta } = useData();

  const currentQuestao = atividade.questoes[currentIndex];
  const progress = ((currentIndex + 1) / atividade.questoes.length) * 100;
  const isLastQuestion = currentIndex === atividade.questoes.length - 1;

  const handleResposta = (questaoId: string, resposta: string) => {
    setRespostas((prev) => ({ ...prev, [questaoId]: resposta }));
  };

  const calcularPontuacao = () => {
    let pontuacao = 0;
    atividade.questoes.forEach(questao => {
      const resposta = respostas[questao.id];
      if (!resposta || !resposta.trim()) return;

      const respostaNorm = resposta.trim().toLowerCase();
      const gabaritoNorm = questao.gabarito.trim().toLowerCase();

      // Para múltipla escolha e verdadeiro/falso: comparação exata
      if (questao.tipo === 'multipla_escolha' || questao.tipo === 'verdadeiro_falso') {
        if (respostaNorm === gabaritoNorm) {
          pontuacao += questao.pontos;
        }
      } 
      // Para dissertativa: pontuação parcial baseada em palavras-chave
      else if (questao.tipo === 'dissertativa') {
        const palavrasChaveGabarito = gabaritoNorm.split(/\s+/).filter(p => p.length > 3);
        const palavrasResposta = respostaNorm.split(/\s+/);
        
        let palavrasEncontradas = 0;
        palavrasChaveGabarito.forEach(palavra => {
          if (palavrasResposta.some(p => p.includes(palavra) || palavra.includes(p))) {
            palavrasEncontradas++;
          }
        });

        // Calcula pontuação proporcional (mínimo 30% de acerto para ganhar pontos)
        const percentualAcerto = palavrasEncontradas / palavrasChaveGabarito.length;
        if (percentualAcerto >= 0.3) {
          pontuacao += Math.round(questao.pontos * percentualAcerto);
        }
      }
    });
    return pontuacao;
  };

  const handleComplete = () => {
    const pontuacao = calcularPontuacao();
    const novaResposta = {
      id: `resp-${Date.now()}`,
      atividadeId: atividade.id,
      alunoId: alunoId,
      respostas: respostas,
      pontuacao: pontuacao,
      dataEnvio: new Date().toISOString(),
      feedback: `Você obteve ${pontuacao} pontos nesta atividade!`
    };

    addResposta(novaResposta);
    
    toast.success(`Atividade concluída! Você ganhou ${pontuacao} pontos! 🎉`, {
      duration: 5000,
    });

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleNext = () => {
    if (!respostas[currentQuestao.id]) {
      toast.error('Por favor, responda a questão antes de continuar');
      return;
    }

    if (isLastQuestion) {
      handleComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {atividade.titulo}
              </h2>
              <p className="text-muted-foreground">
                {atividade.materia} • {atividade.professorNome}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Questão {currentIndex + 1} de {atividade.questoes.length}
                </span>
                <span>{Math.round(progress)}% concluído</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card className="p-8 animate-scale-in">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Questão {currentIndex + 1}
                </h3>
                <p className="text-foreground leading-relaxed text-lg">{currentQuestao.enunciado}</p>
              </div>

              {currentQuestao.tipo === 'multipla_escolha' && currentQuestao.alternativas && (
                <RadioGroup
                  value={respostas[currentQuestao.id] || ''}
                  onValueChange={(value) => handleResposta(currentQuestao.id, value)}
                >
                  <div className="space-y-3">
                    {currentQuestao.alternativas.map((alt, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <RadioGroupItem value={alt} id={`alt-${index}`} />
                        <Label
                          htmlFor={`alt-${index}`}
                          className="flex-1 cursor-pointer text-foreground"
                        >
                          {alt}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {currentQuestao.tipo === 'verdadeiro_falso' && currentQuestao.alternativas && (
                <RadioGroup
                  value={respostas[currentQuestao.id] || ''}
                  onValueChange={(value) => handleResposta(currentQuestao.id, value)}
                >
                  <div className="space-y-3">
                    {currentQuestao.alternativas.map((alt, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <RadioGroupItem value={alt} id={`alt-${index}`} />
                        <Label
                          htmlFor={`alt-${index}`}
                          className="flex-1 cursor-pointer text-foreground"
                        >
                          {alt}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {currentQuestao.tipo === 'dissertativa' && (
                <Textarea
                  value={respostas[currentQuestao.id] || ''}
                  onChange={(e) => handleResposta(currentQuestao.id, e.target.value)}
                  placeholder="Digite sua resposta aqui..."
                  className="min-h-[200px] text-foreground"
                />
              )}

              <div className="mt-8 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {currentQuestao.pontos} ponto{currentQuestao.pontos !== 1 ? 's' : ''}
                </p>
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 px-8"
                >
                  {isLastQuestion ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Enviar Respostas
                    </>
                  ) : (
                    <>
                      Próxima Questão
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResolverAtividadeCard;
