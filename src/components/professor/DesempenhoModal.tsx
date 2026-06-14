import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

interface DesempenhoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DesempenhoModal = ({ isOpen, onClose }: DesempenhoModalProps) => {
  const { user } = useAuth();
  const { getAtividadesByProfessor, getRespostasByAtividade, alunos } = useData();

  const atividadesProfessor = user ? getAtividadesByProfessor(user.id) : [];
  const totalAtividades = atividadesProfessor.filter(a => a.publicada).length;
  const totalRespostas = atividadesProfessor.reduce((acc, ativ) => 
    acc + getRespostasByAtividade(ativ.id).length, 0
  );
  const mediaRespostas = totalAtividades > 0 ? Math.round(totalRespostas / totalAtividades) : 0;

  const atividadesComRespostas = atividadesProfessor
    .filter(a => a.publicada)
    .map(ativ => ({
      ...ativ,
      respostas: getRespostasByAtividade(ativ.id)
    }))
    .sort((a, b) => b.respostas.length - a.respostas.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Desempenho das Atividades</DialogTitle>
          <DialogDescription>
            Análise detalhada do desempenho dos alunos nas suas atividades
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Atividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold">{totalAtividades}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Respostas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-secondary" />
                <span className="text-3xl font-bold">{totalRespostas}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-accent" />
                <span className="text-3xl font-bold">{mediaRespostas}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Respostas por Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Matéria</TableHead>
                  <TableHead>Turmas</TableHead>
                  <TableHead className="text-right">Respostas</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atividadesComRespostas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma atividade publicada ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  atividadesComRespostas.map(ativ => {
                    const totalAlunos = alunos.filter(a => 
                      ativ.turmas.some(turma => a.turma === turma)
                    ).length;
                    const taxa = totalAlunos > 0 
                      ? Math.round((ativ.respostas.length / totalAlunos) * 100)
                      : 0;

                    return (
                      <TableRow key={ativ.id}>
                        <TableCell className="font-medium">{ativ.titulo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ativ.materia}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ativ.turmas.join(', ')}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {ativ.respostas.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={taxa >= 70 ? 'default' : taxa >= 40 ? 'secondary' : 'destructive'}>
                            {taxa}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default DesempenhoModal;
