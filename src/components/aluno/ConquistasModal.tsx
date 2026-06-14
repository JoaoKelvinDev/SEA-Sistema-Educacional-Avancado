import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Flame, Target, Award, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface ConquistasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const todasConquistas = [
  {
    id: 'primeira-atividade',
    nome: 'Primeira Atividade',
    descricao: 'Complete sua primeira atividade',
    icone: Star,
    cor: 'from-yellow-400 to-yellow-600',
    desbloqueada: true
  },
  {
    id: 'sequencia-7',
    nome: 'Sequência 7 dias',
    descricao: 'Complete atividades por 7 dias seguidos',
    icone: Flame,
    cor: 'from-orange-400 to-red-600',
    desbloqueada: true
  },
  {
    id: 'nota-maxima',
    nome: 'Nota Máxima',
    descricao: 'Obtenha 100% em uma atividade',
    icone: Trophy,
    cor: 'from-primary to-primary-glow',
    desbloqueada: false
  },
  {
    id: '10-atividades',
    nome: '10 Atividades',
    descricao: 'Complete 10 atividades',
    icone: Target,
    cor: 'from-green-400 to-green-600',
    desbloqueada: false
  },
  {
    id: 'especialista',
    nome: 'Especialista',
    descricao: 'Obtenha média 90+ em uma matéria',
    icone: Award,
    cor: 'from-purple-400 to-purple-600',
    desbloqueada: false
  },
  {
    id: 'rapido',
    nome: 'Relâmpago',
    descricao: 'Complete uma atividade em menos de 5 minutos',
    icone: Zap,
    cor: 'from-blue-400 to-blue-600',
    desbloqueada: false
  }
];

const ConquistasModal = ({ isOpen, onClose }: ConquistasModalProps) => {
  const { user } = useAuth();
  const { getRespostasByAluno } = useData();

  // Sistema dinâmico de conquistas
  const respostas = user ? getRespostasByAluno(user.id) : [];
  
  const conquistasComStatus = todasConquistas.map(conquista => {
    let desbloqueada = false;

    if (conquista.id === 'primeira-atividade') {
      desbloqueada = respostas.length >= 1;
    } else if (conquista.id === 'nota-maxima') {
      desbloqueada = respostas.some(r => {
        const atividade = r.atividadeId;
        const pontuacao = r.pontuacao || 0;
        // Assume que temos acesso ao total de pontos
        return pontuacao >= 100;
      });
    } else if (conquista.id === '10-atividades') {
      desbloqueada = respostas.length >= 10;
    } else if (conquista.id === 'sequencia-7') {
      // Simula verificação de sequência (mock)
      desbloqueada = respostas.length >= 7;
    } else if (conquista.id === 'especialista') {
      desbloqueada = respostas.length >= 5;
    } else if (conquista.id === 'rapido') {
      desbloqueada = respostas.length >= 3;
    }

    return { ...conquista, desbloqueada };
  });

  const conquistasDesbloqueadas = conquistasComStatus.filter(c => c.desbloqueada);
  const conquistasBloqueadas = conquistasComStatus.filter(c => !c.desbloqueada);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Minhas Conquistas
          </DialogTitle>
          <DialogDescription>
            Você desbloqueou {conquistasDesbloqueadas.length} de {todasConquistas.length} conquistas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Desbloqueadas ({conquistasDesbloqueadas.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conquistasDesbloqueadas.map(conquista => (
                <Card key={conquista.id} className="p-4 hover-scale">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${conquista.cor}`}>
                      <conquista.icone className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1">
                        {conquista.nome}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {conquista.descricao}
                      </p>
                      <Badge variant="default" className="mt-2">
                        Desbloqueada ✓
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Bloqueadas ({conquistasBloqueadas.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conquistasBloqueadas.map(conquista => (
                <Card key={conquista.id} className="p-4 opacity-60">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <conquista.icone className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1">
                        {conquista.nome}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {conquista.descricao}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        Bloqueada 🔒
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConquistasModal;
