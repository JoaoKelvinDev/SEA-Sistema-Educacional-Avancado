import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Award, Clock } from 'lucide-react';
import { Atividade } from '@/types';

interface VisualizarAtividadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividade: Atividade | null;
}

const VisualizarAtividadeModal = ({ isOpen, onClose, atividade }: VisualizarAtividadeModalProps) => {
  if (!atividade) return null;

  const totalPontos = atividade.questoes.reduce((acc, q) => acc + q.pontos, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{atividade.titulo}</DialogTitle>
          <DialogDescription>
            {atividade.descricao || 'Visualização completa da atividade'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 mb-4">
          <Badge variant="default">{atividade.materia}</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {totalPontos} pontos
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {atividade.questoes.length} questões
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {atividade.dataCriacao}
          </Badge>
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-muted-foreground">
            Professor: {atividade.professorNome}
          </p>
          <p className="text-sm text-muted-foreground">
            Turmas: {atividade.turmas.join(', ')}
          </p>
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {atividade.questoes.map((questao, index) => (
              <Card key={questao.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-foreground">
                    Questão {index + 1}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{questao.pontos} pts</Badge>
                    <Badge variant="outline">
                      {questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' :
                       questao.tipo === 'verdadeiro_falso' ? 'V/F' : 'Dissertativa'}
                    </Badge>
                  </div>
                </div>

                <p className="text-foreground mb-4 leading-relaxed">
                  {questao.enunciado}
                </p>

                {questao.tipo === 'multipla_escolha' && questao.alternativas && (
                  <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                    {questao.alternativas.map((alt, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded ${
                          alt === questao.gabarito 
                            ? 'bg-primary/10 border border-primary/30 font-medium' 
                            : 'bg-background'
                        }`}
                      >
                        <span className="font-semibold">
                          {String.fromCharCode(65 + idx)})
                        </span>{' '}
                        {alt}
                        {alt === questao.gabarito && (
                          <span className="ml-2 text-primary">✓ Resposta correta</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {questao.tipo === 'verdadeiro_falso' && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm">
                      <span className="font-semibold">Resposta correta:</span>{' '}
                      <Badge variant="default">{questao.gabarito}</Badge>
                    </p>
                  </div>
                )}

                {questao.tipo === 'dissertativa' && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Resposta esperada:</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {questao.gabarito}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default VisualizarAtividadeModal;
