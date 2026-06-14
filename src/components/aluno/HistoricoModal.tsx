import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, CheckCircle, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface HistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoricoModal = ({ isOpen, onClose }: HistoricoModalProps) => {
  const { user } = useAuth();
  const { getRespostasByAluno, atividades } = useData();

  const respostas = user ? getRespostasByAluno(user.id) : [];
  const respostasOrdenadas = [...respostas].sort((a, b) => 
    new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime()
  );

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Histórico de Atividades
          </DialogTitle>
          <DialogDescription>
            Veja todas as atividades que você já completou
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {respostasOrdenadas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Você ainda não completou nenhuma atividade
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {respostasOrdenadas.map(resposta => {
                const atividade = atividades.find(a => a.id === resposta.atividadeId);
                if (!atividade) return null;

                const totalPontos = atividade.questoes.reduce((acc, q) => acc + q.pontos, 0);
                const porcentagem = totalPontos > 0 
                  ? Math.round(((resposta.pontuacao || 0) / totalPontos) * 100)
                  : 0;

                return (
                  <Card key={resposta.id} className="p-4 hover-scale">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1">
                          {atividade.titulo}
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline">{atividade.materia}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {atividade.professorNome}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="text-xl font-bold text-primary">
                          {resposta.pontuacao || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatarData(resposta.dataEnvio)}
                      </div>
                      <Badge 
                        variant={
                          porcentagem >= 80 ? 'default' : 
                          porcentagem >= 60 ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {porcentagem}% de acerto
                      </Badge>
                    </div>

                    {resposta.feedback && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-foreground">
                          <strong>Feedback:</strong> {resposta.feedback}
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoModal;
