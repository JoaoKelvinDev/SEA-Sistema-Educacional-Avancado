import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/contexts/DataContext';
import { User, RespostaAluno, Atividade } from '@/types';
import { 
  Award, 
  TrendingUp, 
  Target, 
  BookOpen, 
  Star,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Users,
  GraduationCap
} from 'lucide-react';

interface DesempenhoAlunosModalProps {
  isOpen: boolean;
  onClose: () => void;
  professorId?: string; // Se fornecido, filtra apenas atividades do professor
}

interface AlunoStats {
  aluno: User;
  atividadesConcluidas: number;
  atividadesDisponiveis: number;
  mediaGeral: number;
  totalPontos: number;
  desempenhoPorMateria: { [materia: string]: { pontos: number; total: number; media: number } };
  respostas: RespostaAluno[];
}

interface TurmaStats {
  nome: string;
  totalAlunos: number;
  mediaGeral: number;
  atividadesConcluidas: number;
  atividadesDisponiveis: number;
  taxaConclusao: number;
  alunos: AlunoStats[];
}

const DesempenhoAlunosModal = ({ isOpen, onClose, professorId }: DesempenhoAlunosModalProps) => {
  const { alunos, atividades, respostas, getRespostasByAluno, getAtividadesByAluno } = useData();
  const [turmaSelecionada, setTurmaSelecionada] = useState<TurmaStats | null>(null);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoStats | null>(null);

  // Filtrar atividades se for professor
  const atividadesFiltradas = professorId 
    ? atividades.filter(a => a.professorId === professorId && a.publicada)
    : atividades.filter(a => a.publicada);

  // Obter lista de turmas únicas
  const turmasUnicas = Array.from(new Set(alunos.map(a => a.turma).filter(Boolean))) as string[];

  // Calcular estatísticas de cada aluno
  const calcularAlunoStats = (aluno: User): AlunoStats => {
    const respostasAluno = getRespostasByAluno(aluno.id);
    const atividadesDisponiveis = aluno.turma 
      ? atividadesFiltradas.filter(a => a.turmas.includes(aluno.turma!))
      : [];

    const desempenhoPorMateria: { [materia: string]: { pontos: number; total: number; media: number } } = {};

    respostasAluno.forEach(resposta => {
      const atividade = atividades.find(a => a.id === resposta.atividadeId);
      if (!atividade || (professorId && atividade.professorId !== professorId)) return;

      const materia = atividade.materia;
      if (!desempenhoPorMateria[materia]) {
        desempenhoPorMateria[materia] = { pontos: 0, total: 0, media: 0 };
      }

      const totalPontosAtividade = atividade.questoes.reduce((acc, q) => acc + q.pontos, 0);
      desempenhoPorMateria[materia].pontos += resposta.pontuacao || 0;
      desempenhoPorMateria[materia].total += totalPontosAtividade;
    });

    // Calcular médias por matéria
    Object.keys(desempenhoPorMateria).forEach(materia => {
      const stats = desempenhoPorMateria[materia];
      stats.media = stats.total > 0 ? (stats.pontos / stats.total) * 100 : 0;
    });

    const totalPontos = respostasAluno.reduce((acc, r) => acc + (r.pontuacao || 0), 0);
    const totalPossivel = respostasAluno.reduce((acc, r) => {
      const ativ = atividades.find(a => a.id === r.atividadeId);
      return acc + (ativ?.questoes.reduce((sum, q) => sum + q.pontos, 0) || 0);
    }, 0);

    return {
      aluno,
      atividadesConcluidas: respostasAluno.length,
      atividadesDisponiveis: atividadesDisponiveis.length,
      mediaGeral: totalPossivel > 0 ? (totalPontos / totalPossivel) * 100 : 0,
      totalPontos,
      desempenhoPorMateria,
      respostas: respostasAluno
    };
  };

  // Calcular estatísticas por turma
  const turmasStats: TurmaStats[] = turmasUnicas.map(turma => {
    const alunosDaTurma = alunos.filter(a => a.turma === turma);
    const alunosStats = alunosDaTurma.map(calcularAlunoStats).sort((a, b) => b.mediaGeral - a.mediaGeral);
    
    const mediaGeral = alunosStats.length > 0
      ? alunosStats.reduce((acc, a) => acc + a.mediaGeral, 0) / alunosStats.length
      : 0;
    
    const atividadesConcluidas = alunosStats.reduce((acc, a) => acc + a.atividadesConcluidas, 0);
    const atividadesDisponiveis = alunosStats.reduce((acc, a) => acc + a.atividadesDisponiveis, 0);
    const taxaConclusao = atividadesDisponiveis > 0 
      ? (atividadesConcluidas / atividadesDisponiveis) * 100 
      : 0;

    return {
      nome: turma,
      totalAlunos: alunosDaTurma.length,
      mediaGeral,
      atividadesConcluidas,
      atividadesDisponiveis,
      taxaConclusao,
      alunos: alunosStats
    };
  }).sort((a, b) => b.mediaGeral - a.mediaGeral);

  const renderListaTurmas = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Turmas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-3xl font-bold">{turmasStats.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-secondary" />
              <span className="text-3xl font-bold">{alunos.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-accent" />
              <span className="text-3xl font-bold">
                {turmasStats.length > 0 
                  ? Math.round(turmasStats.reduce((acc, t) => acc + t.mediaGeral, 0) / turmasStats.length)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmasStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 col-span-full">
                Nenhuma turma encontrada
              </p>
            ) : (
              turmasStats.map(turma => (
                <Card 
                  key={turma.nome} 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => setTurmaSelecionada(turma)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      {turma.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Alunos</span>
                      <Badge variant="outline">{turma.totalAlunos}</Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Média Geral</span>
                        <Badge variant={turma.mediaGeral >= 70 ? 'default' : turma.mediaGeral >= 50 ? 'secondary' : 'destructive'}>
                          {Math.round(turma.mediaGeral)}%
                        </Badge>
                      </div>
                      <Progress value={turma.mediaGeral} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
                        <span className="text-sm font-medium">{Math.round(turma.taxaConclusao)}%</span>
                      </div>
                      <Progress value={turma.taxaConclusao} />
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Atividades</span>
                        <span className="font-medium">
                          {turma.atividadesConcluidas}/{turma.atividadesDisponiveis}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderListaAlunosDaTurma = (turma: TurmaStats) => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setTurmaSelecionada(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Turmas
        </Button>
        <div>
          <h3 className="text-2xl font-bold">{turma.nome}</h3>
          <p className="text-muted-foreground">
            {turma.totalAlunos} alunos • Média: {Math.round(turma.mediaGeral)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-3xl font-bold">{turma.totalAlunos}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média da Turma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-secondary" />
              <span className="text-3xl font-bold">{Math.round(turma.mediaGeral)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-accent" />
              <span className="text-3xl font-bold">{Math.round(turma.taxaConclusao)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-3xl font-bold">
                {turma.atividadesConcluidas}/{turma.atividadesDisponiveis}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alunos da Turma</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-right">Atividades</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Média</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turma.alunos.map(stats => (
                <TableRow key={stats.aluno.id}>
                  <TableCell className="font-medium">{stats.aluno.name}</TableCell>
                  <TableCell className="text-right">
                    {stats.atividadesConcluidas}/{stats.atividadesDisponiveis}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {stats.totalPontos}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={
                        stats.mediaGeral >= 70 ? 'default' : 
                        stats.mediaGeral >= 50 ? 'secondary' : 
                        'destructive'
                      }
                    >
                      {Math.round(stats.mediaGeral)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAlunoSelecionado(stats)}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderDetalhesAluno = (stats: AlunoStats) => {
    const respostasComAtividades = stats.respostas
      .map(r => ({
        resposta: r,
        atividade: atividades.find(a => a.id === r.atividadeId)
      }))
      .filter(item => item.atividade)
      .sort((a, b) => new Date(b.resposta.dataEnvio).getTime() - new Date(a.resposta.dataEnvio).getTime());

    const taxaConclusao = stats.atividadesDisponiveis > 0
      ? (stats.atividadesConcluidas / stats.atividadesDisponiveis) * 100
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setAlunoSelecionado(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para a Turma
          </Button>
          <div>
            <h3 className="text-2xl font-bold">{stats.aluno.name}</h3>
            <p className="text-muted-foreground">
              {stats.aluno.turma} • {stats.aluno.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {Math.round(stats.mediaGeral)}%
              </div>
              <Progress value={stats.mediaGeral} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-accent" />
                <span className="text-3xl font-bold">{stats.totalPontos}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atividades Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.atividadesConcluidas}/{stats.atividadesDisponiveis}
              </div>
              <Progress value={taxaConclusao} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Badges Conquistadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-secondary" />
                <span className="text-3xl font-bold">
                  {stats.aluno.badges?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="materias" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="materias">Desempenho por Matéria</TabsTrigger>
            <TabsTrigger value="historico">Histórico de Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="materias">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por Matéria</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.desempenhoPorMateria).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma atividade concluída ainda
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(stats.desempenhoPorMateria).map(([materia, dados]) => (
                      <div key={materia} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <span className="font-medium">{materia}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {dados.pontos}/{dados.total} pontos
                            </span>
                            <Badge variant={dados.media >= 70 ? 'default' : dados.media >= 50 ? 'secondary' : 'destructive'}>
                              {Math.round(dados.media)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={dados.media} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {respostasComAtividades.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma atividade concluída ainda
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {respostasComAtividades.map(({ resposta, atividade }) => {
                        if (!atividade) return null;
                        const totalPontos = atividade.questoes.reduce((acc, q) => acc + q.pontos, 0);
                        const percentual = totalPontos > 0 
                          ? ((resposta.pontuacao || 0) / totalPontos) * 100 
                          : 0;

                        return (
                          <div key={resposta.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold">{atividade.titulo}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{atividade.materia}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(resposta.dataEnvio).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {percentual >= 70 ? (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-destructive" />
                                )}
                                <Badge variant={percentual >= 70 ? 'default' : percentual >= 50 ? 'secondary' : 'destructive'}>
                                  {resposta.pontuacao}/{totalPontos}
                                </Badge>
                              </div>
                            </div>
                            {resposta.feedback && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {resposta.feedback}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {stats.aluno.badges && stats.aluno.badges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.aluno.badges.map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-sm py-1">
                    <Award className="h-3 w-3 mr-1" />
                    {badge}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {alunoSelecionado 
              ? 'Detalhes do Aluno' 
              : turmaSelecionada 
                ? `Turma ${turmaSelecionada.nome}` 
                : 'Desempenho por Turmas'}
          </DialogTitle>
          <DialogDescription>
            {alunoSelecionado 
              ? 'Análise completa do desempenho individual do aluno'
              : turmaSelecionada
                ? 'Desempenho detalhado de todos os alunos da turma'
                : 'Selecione uma turma para visualizar o desempenho dos alunos'}
          </DialogDescription>
        </DialogHeader>

        {alunoSelecionado 
          ? renderDetalhesAluno(alunoSelecionado) 
          : turmaSelecionada 
            ? renderListaAlunosDaTurma(turmaSelecionada)
            : renderListaTurmas()}
      </DialogContent>
    </Dialog>
  );
};

export default DesempenhoAlunosModal;
