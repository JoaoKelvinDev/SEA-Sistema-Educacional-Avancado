import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Atividade, Questao } from '@/types';
import { validateAtividade } from '@/lib/atividadeValidation';

interface EditarAtividadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividade: Atividade | null;
}

const materias = ['Matemática', 'Português', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Sociologia', 'Filosofia', 'Inglês', 'Arte', 'Educação Física'];

const EditarAtividadeModal = ({ isOpen, onClose, atividade }: EditarAtividadeModalProps) => {
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { updateAtividade, professorTurmas, professorTurmasError, isLoading } = useData();
  const turmasDisponiveis = professorTurmas.filter(v => v.professorId === user?.id).map(v => v.turma);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    materia: '',
    turmas: [] as string[],
    questoes: [] as Questao[],
  });

  useEffect(() => {
    if (atividade) {
      setFormData({
        titulo: atividade.titulo,
        descricao: atividade.descricao || '',
        materia: atividade.materia,
        turmas: atividade.turmas,
        questoes: atividade.questoes,
      });
    }
  }, [atividade]);

  const handleAddQuestao = () => {
    setFormData({
      ...formData,
      questoes: [
        ...formData.questoes,
        {
          id: `q-${Date.now()}`,
          enunciado: '',
          tipo: 'multipla_escolha',
          alternativas: ['', '', '', ''],
          gabarito: '',
          pontos: 10
        }
      ]
    });
  };

  const handleRemoveQuestao = (index: number) => {
    setFormData({
      ...formData,
      questoes: formData.questoes.filter((_, i) => i !== index)
    });
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
    }
  };

  const handleUpdateQuestao = <K extends keyof Questao>(index: number, field: K, value: Questao[K]) => {
    const updatedQuestoes = [...formData.questoes];
    updatedQuestoes[index] = { ...updatedQuestoes[index], [field]: value };
    setFormData({ ...formData, questoes: updatedQuestoes });
  };

  const handleUpdateAlternativa = (questaoIndex: number, altIndex: number, value: string) => {
    const updatedQuestoes = [...formData.questoes];
    const alternativas = [...(updatedQuestoes[questaoIndex].alternativas || [])];
    alternativas[altIndex] = value;
    updatedQuestoes[questaoIndex] = { ...updatedQuestoes[questaoIndex], alternativas };
    setFormData({ ...formData, questoes: updatedQuestoes });
  };

  const handleSalvar = async (publicar: boolean) => {
    if (!atividade) return;
    if (isLoading || professorTurmasError) {
      toast.error('Aguarde o carregamento das turmas ou atualize os dados antes de salvar.');
      return;
    }
    if (formData.turmas.some(turma => !turmasDisponiveis.includes(turma))) {
      toast.error('Esta atividade contém turmas que não estão mais atribuídas a você. Atualize os dados e consulte o administrador.');
      return;
    }

    if (publicar) {
      const validationError = validateAtividade(formData);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    } else if (!formData.titulo.trim()) {
      toast.error('Informe um título para salvar o rascunho.');
      return;
    }

    setIsSaving(true);
    try {
      await updateAtividade(atividade.id, {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao,
        materia: formData.materia,
        turmas: formData.turmas,
        questoes: formData.questoes,
        publicada: publicar
      });

      toast.success(publicar ? 'Atividade publicada com sucesso!' : 'Atividade salva como rascunho!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar atividade:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar atividade.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!atividade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Atividade</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias na atividade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título da Atividade *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Equações do 2º Grau"
              />
            </div>
            <div>
              <Label>Matéria *</Label>
              <Select value={formData.materia} onValueChange={(v) => setFormData({ ...formData, materia: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {materias.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva os objetivos da atividade..."
              rows={3}
            />
          </div>

          <div>
            <Label>Turmas *</Label>
            {(isLoading || professorTurmasError || turmasDisponiveis.length === 0) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {isLoading ? 'Carregando turmas...' : professorTurmasError ||
                  'Nenhuma turma atribuída. Consulte o administrador antes de publicar.'}
              </p>
            )}
            {formData.turmas.some(turma => !turmasDisponiveis.includes(turma)) && (
              <p className="mt-2 text-sm text-destructive">
                Esta atividade possui turmas fora dos seus vínculos atuais. O administrador precisa verificar as atribuições antes da edição.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {turmasDisponiveis.map(turma => (
                <Button
                  key={turma}
                  type="button"
                  variant={formData.turmas.includes(turma) ? 'default' : 'outline'}
                  size="sm"
                  disabled={isLoading || Boolean(professorTurmasError) || isSaving}
                  onClick={() => {
                    if (formData.turmas.includes(turma)) {
                      setFormData({ ...formData, turmas: formData.turmas.filter(t => t !== turma) });
                    } else {
                      setFormData({ ...formData, turmas: [...formData.turmas, turma] });
                    }
                  }}
                >
                  {turma}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Questões *</Label>
              <Button type="button" size="sm" onClick={handleAddQuestao}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Questão
              </Button>
            </div>

            {formData.questoes.map((questao, index) => (
              <div key={index} className="p-4 border rounded-lg mb-4 bg-card">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Questão {index + 1}</h4>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingQuestionIndex(editingQuestionIndex === index ? null : index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestao(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {editingQuestionIndex === index ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Enunciado *</Label>
                      <Textarea
                        value={questao.enunciado}
                        onChange={(e) => handleUpdateQuestao(index, 'enunciado', e.target.value)}
                        placeholder="Digite o enunciado da questão..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo *</Label>
                        <Select 
                          value={questao.tipo} 
                          onValueChange={(v) => {
                            if (v === 'verdadeiro_falso') {
                              handleUpdateQuestao(index, 'tipo', 'verdadeiro_falso');
                              handleUpdateQuestao(index, 'alternativas', ['Verdadeiro', 'Falso']);
                            } else if (v === 'dissertativa') {
                              handleUpdateQuestao(index, 'tipo', 'dissertativa');
                              handleUpdateQuestao(index, 'alternativas', undefined);
                            } else if (v === 'multipla_escolha') {
                              handleUpdateQuestao(index, 'tipo', 'multipla_escolha');
                              if (!questao.alternativas) {
                                handleUpdateQuestao(index, 'alternativas', ['', '', '', '']);
                              }
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                            <SelectItem value="dissertativa">Dissertativa</SelectItem>
                            <SelectItem value="verdadeiro_falso">Verdadeiro/Falso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Pontos *</Label>
                        <Input
                          type="number"
                          value={questao.pontos}
                          onChange={(e) => handleUpdateQuestao(index, 'pontos', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>
                    </div>

                    {questao.tipo === 'multipla_escolha' && (
                      <div>
                        <Label>Alternativas *</Label>
                        <div className="space-y-2 mt-2">
                          {questao.alternativas?.map((alt, altIndex) => (
                            <Input
                              key={altIndex}
                              value={alt}
                              onChange={(e) => handleUpdateAlternativa(index, altIndex, e.target.value)}
                              placeholder={`Alternativa ${String.fromCharCode(65 + altIndex)}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {questao.tipo === 'verdadeiro_falso' && (
                      <div className="text-sm text-muted-foreground">
                        Alternativas: Verdadeiro / Falso
                      </div>
                    )}

                    <div>
                      <Label>Gabarito *</Label>
                      {questao.tipo === 'multipla_escolha' ? (
                        <Select value={questao.gabarito} onValueChange={(v) => handleUpdateQuestao(index, 'gabarito', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a resposta correta" />
                          </SelectTrigger>
                          <SelectContent>
                            {questao.alternativas?.map((alt, idx) => alt.trim() ? (
                              <SelectItem key={idx} value={alt}>
                                {String.fromCharCode(65 + idx)}: {alt}
                              </SelectItem>
                            ) : null)}
                          </SelectContent>
                        </Select>
                      ) : questao.tipo === 'verdadeiro_falso' ? (
                        <Select value={questao.gabarito} onValueChange={(v) => handleUpdateQuestao(index, 'gabarito', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a resposta correta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Verdadeiro">Verdadeiro</SelectItem>
                            <SelectItem value="Falso">Falso</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Textarea
                          value={questao.gabarito}
                          onChange={(e) => handleUpdateQuestao(index, 'gabarito', e.target.value)}
                          placeholder="Digite a resposta esperada para correção..."
                          rows={3}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-foreground mb-2">{questao.enunciado}</p>
                    {questao.tipo === 'multipla_escolha' && questao.alternativas && (
                      <div className="space-y-1 mb-2 text-xs text-muted-foreground">
                        {questao.alternativas.map((alt, idx) => (
                          <div key={idx}>
                            {String.fromCharCode(65 + idx)}) {alt} {alt === questao.gabarito && '✓'}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Tipo: {questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : questao.tipo === 'verdadeiro_falso' ? 'Verdadeiro/Falso' : 'Dissertativa'} • {questao.pontos} pontos • Gabarito: {questao.gabarito}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => void handleSalvar(false)} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar como Rascunho'}
            </Button>
            <Button type="button" onClick={() => void handleSalvar(true)} disabled={isSaving} className="bg-gradient-to-r from-primary to-primary-glow">
              {isSaving ? 'Salvando...' : atividade.publicada ? 'Atualizar Atividade' : 'Publicar Atividade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditarAtividadeModal;
