import { useState } from 'react';
import Header from '@/components/shared/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, BookOpen, BarChart3, AlertCircle, Users } from 'lucide-react';
import CriarAtividadeModal from './CriarAtividadeModal';
import MinhasAtividadesModal from './MinhasAtividadesModal';
import DesempenhoModal from './DesempenhoModal';
import DesempenhoAlunosModal from '@/components/shared/DesempenhoAlunosModal';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const DashboardProfessor = () => {
  const [showCriarAtividade, setShowCriarAtividade] = useState(false);
  const [showMinhasAtividades, setShowMinhasAtividades] = useState(false);
  const [showDesempenho, setShowDesempenho] = useState(false);
  const [showDesempenhoAlunos, setShowDesempenhoAlunos] = useState(false);
  const { user } = useAuth();
  const { getAtividadesByProfessor, getRespostasByAtividade, alunos } = useData();

  const atividadesProfessor = user ? getAtividadesByProfessor(user.id) : [];
  const totalRespostas = atividadesProfessor.reduce((acc, ativ) => 
    acc + getRespostasByAtividade(ativ.id).length, 0
  );

  const stats = [
    {
      title: 'Atividades Publicadas',
      value: atividadesProfessor.filter(a => a.publicada).length.toString(),
      icon: BookOpen,
      color: 'from-primary to-primary-glow',
    },
    {
      title: 'Alunos Ativos',
      value: alunos.length.toString(),
      icon: BarChart3,
      color: 'from-secondary to-green-500',
    },
    {
      title: 'Total de Respostas',
      value: totalRespostas.toString(),
      icon: BarChart3,
      color: 'from-accent to-orange-600',
    },
  ];

  const atividadesRecentes = atividadesProfessor.slice(-3).reverse();

  const alertasIA = [
    {
      tipo: 'warning',
      mensagem: `${alunos.filter(a => a.ativo !== false).length} alunos ativos na plataforma`,
      acao: 'Ver alunos',
    },
    {
      tipo: 'info',
      mensagem: 'Últimas atividades têm boa taxa de conclusão',
      acao: 'Analisar',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Painel do Professor
          </h2>
          <p className="text-muted-foreground">
            Crie atividades e acompanhe o desempenho dos alunos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-lg transition-shadow animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} inline-block mb-4`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Button
            onClick={() => setShowCriarAtividade(true)}
            className="h-24 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg font-semibold"
          >
            <Mic className="w-6 h-6 mr-3" />
            Criar Atividade por Áudio
          </Button>
          
          <Button
            onClick={() => setShowMinhasAtividades(true)}
            variant="outline"
            className="h-24 text-lg font-semibold border-2"
          >
            <BookOpen className="w-6 h-6 mr-3" />
            Minhas Atividades
          </Button>
          
          <Button
            onClick={() => setShowDesempenho(true)}
            variant="outline"
            className="h-24 text-lg font-semibold border-2"
          >
            <BarChart3 className="w-6 h-6 mr-3" />
            Análise de Desempenho
          </Button>

          <Button
            onClick={() => setShowDesempenhoAlunos(true)}
            variant="outline"
            className="h-24 text-lg font-semibold border-2"
          >
            <Users className="w-6 h-6 mr-3" />
            Desempenho dos Alunos
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Atividades Recentes</h3>
            {atividadesRecentes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma atividade criada ainda. Clique em "Criar Atividade por Áudio" para começar!
              </p>
            ) : (
              <div className="space-y-4">
                {atividadesRecentes.map((ativ, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{ativ.titulo}</h4>
                      <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary rounded">
                        {ativ.publicada ? 'Publicada' : 'Rascunho'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {ativ.materia} • Turmas: {ativ.turmas.join(', ')}
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      {getRespostasByAtividade(ativ.id).length} respostas recebidas
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-accent" />
              Alertas Inteligentes
            </h3>
            <div className="space-y-4">
              {alertasIA.map((alerta, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-accent/10 border border-accent/20"
                >
                  <p className="text-sm text-foreground mb-3">
                    {alerta.mensagem}
                  </p>
                  <Button variant="outline" size="sm">
                    {alerta.acao}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <CriarAtividadeModal
        isOpen={showCriarAtividade}
        onClose={() => setShowCriarAtividade(false)}
      />
      
      <MinhasAtividadesModal
        isOpen={showMinhasAtividades}
        onClose={() => setShowMinhasAtividades(false)}
      />
      
      <DesempenhoModal
        isOpen={showDesempenho}
        onClose={() => setShowDesempenho(false)}
      />

      <DesempenhoAlunosModal
        isOpen={showDesempenhoAlunos}
        onClose={() => setShowDesempenhoAlunos(false)}
        professorId={user?.id}
      />
    </div>
  );
};

export default DashboardProfessor;
