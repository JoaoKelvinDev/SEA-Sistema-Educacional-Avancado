import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, KeyRound, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GerenciarAlunos() {
  const { alunos, updateUser, deleteUser, resetUserPassword } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlunos = alunos.filter(aluno => 
    aluno.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.turma?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover ${name}?`)) {
      deleteUser(id);
      toast({
        title: "Aluno removido",
        description: `${name} foi removido do sistema.`,
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = (id: string, name: string) => {
    const newPassword = prompt(`Digite a nova senha para ${name}:`);
    if (newPassword) {
      resetUserPassword(id, newPassword);
      toast({
        title: "Senha resetada",
        description: `Senha de ${name} foi alterada com sucesso.`,
      });
    }
  };

  const handleToggleStatus = (aluno: any) => {
    const newStatus = aluno.ativo === false ? true : false;
    updateUser(aluno.id, { ...aluno, ativo: newStatus });
    toast({
      title: newStatus ? "Aluno ativado" : "Aluno desativado",
      description: `${aluno.name} foi ${newStatus ? 'ativado' : 'desativado'}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Alunos</CardTitle>
        <CardDescription>Visualize e gerencie todos os alunos cadastrados</CardDescription>
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
                      onClick={() => handleToggleStatus(aluno)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(aluno.id, aluno.name)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(aluno.id, aluno.name)}
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
