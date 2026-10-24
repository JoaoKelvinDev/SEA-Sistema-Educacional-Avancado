import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Power, Trash2, KeyRound, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';

export default function GerenciarAlunos() {
  const { alunos, updateUser, deleteUser } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const filteredAlunos = alunos.filter(aluno => 
    aluno.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.turma?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja desativar ${name}?`)) return;

    setPendingUserId(id);
    try {
      await deleteUser(id);
      toast({
        title: 'Aluno desativado',
        description: `${name} foi desativado.`,
      });
    } catch (error) {
      console.error('Erro ao desativar aluno:', error);
      toast({
        title: 'Não foi possível desativar o aluno',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleToggleStatus = async (aluno: User) => {
    const newStatus = aluno.ativo === false ? true : false;
    setPendingUserId(aluno.id);
    try {
      await updateUser(aluno.id, { ativo: newStatus });
      toast({
        title: newStatus ? 'Aluno ativado' : 'Aluno desativado',
        description: `${aluno.name} foi ${newStatus ? 'ativado' : 'desativado'}.`,
      });
    } catch (error) {
      console.error('Erro ao alterar status do aluno:', error);
      toast({
        title: 'Não foi possível alterar o status',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Alunos</CardTitle>
        <CardDescription>
          Visualize e gerencie os alunos. A redefinição de senha ficará disponível quando a função administrativa segura do backend estiver configurada.
        </CardDescription>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAlunos.map((aluno) => (
              <TableRow key={aluno.id}>
                <TableCell className="font-medium">{aluno.name}</TableCell>
                <TableCell>{aluno.email}</TableCell>
                <TableCell>{aluno.turma}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{aluno.pontos || 0} pts</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={aluno.ativo === false ? "destructive" : "default"}>
                    {aluno.ativo === false ? 'Inativo' : 'Ativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingUserId === aluno.id}
                      onClick={() => void handleToggleStatus(aluno)}
                      title={aluno.ativo === false ? 'Ativar aluno' : 'Desativar aluno'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      title="Redefinição segura requer uma função administrativa no backend."
                      aria-label="Redefinição de senha indisponível até configuração do backend"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pendingUserId === aluno.id}
                      onClick={() => void handleDelete(aluno.id, aluno.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
