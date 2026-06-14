import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Eye, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { Atividade } from '@/types';
import VisualizarAtividadeModal from '@/components/shared/VisualizarAtividadeModal';
import EditarAtividadeModal from '@/components/professor/EditarAtividadeModal';

interface MinhasAtividadesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MinhasAtividadesModal = ({ isOpen, onClose }: MinhasAtividadesModalProps) => {
  const { user } = useAuth();
  const { getAtividadesByProfessor, deleteAtividade } = useData();
  const [atividadeVisualizar, setAtividadeVisualizar] = useState<Atividade | null>(null);
  const [atividadeEditar, setAtividadeEditar] = useState<Atividade | null>(null);

  const atividadesProfessor = user ? getAtividadesByProfessor(user.id) : [];
  const publicadas = atividadesProfessor.filter(a => a.publicada);
  const rascunhos = atividadesProfessor.filter(a => !a.publicada);

  const handleDelete = (id: string, titulo: string) => {
    if (confirm(`Tem certeza que deseja excluir "${titulo}"?`)) {
      deleteAtividade(id);
      toast.success('Atividade excluída com sucesso!');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Minhas Atividades</DialogTitle>
            <DialogDescription>
              Gerencie todas as suas atividades publicadas e rascunhos
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="publicadas">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="publicadas">
                Publicadas ({publicadas.length})
              </TabsTrigger>
              <TabsTrigger value="rascunhos">
                Rascunhos ({rascunhos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="publicadas" className="space-y-4 mt-4">
              {publicadas.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhuma atividade publicada ainda
                  </p>
                </div>
              ) : (
                publicadas.map(ativ => (
                  <Card key={ativ.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-foreground">{ativ.titulo}</h4>
                          <Badge variant="default">Publicada</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ativ.descricao}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline">{ativ.materia}</Badge>
                          <span className="text-muted-foreground">
                            {ativ.turmas.join(', ')}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {ativ.questoes.length} questões
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAtividadeVisualizar(ativ)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(ativ.id, ativ.titulo)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="rascunhos" className="space-y-4 mt-4">
              {rascunhos.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum rascunho salvo
                  </p>
                </div>
              ) : (
                rascunhos.map(ativ => (
                  <Card key={ativ.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-foreground">{ativ.titulo}</h4>
                          <Badge variant="secondary">Rascunho</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ativ.descricao || 'Sem descrição'}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline">{ativ.materia}</Badge>
                          <span className="text-muted-foreground">
                            {ativ.questoes.length} questões
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAtividadeEditar(ativ)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAtividadeVisualizar(ativ)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(ativ.id, ativ.titulo)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <VisualizarAtividadeModal
        isOpen={!!atividadeVisualizar}
        onClose={() => setAtividadeVisualizar(null)}
        atividade={atividadeVisualizar}
      />

      <EditarAtividadeModal
        isOpen={!!atividadeEditar}
        onClose={() => setAtividadeEditar(null)}
        atividade={atividadeEditar}
      />
    </>
  );
};

export default MinhasAtividadesModal;
