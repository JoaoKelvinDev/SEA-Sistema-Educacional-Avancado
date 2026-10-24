import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Questao } from '@/types';
import { validateAtividade } from '@/lib/atividadeValidation';

interface GeneratedActivity {
  titulo: string;
  descricao: string;
  materia: string;
  questoes: Array<Omit<Questao, 'id'>>;
}

interface ApiError {
  error?: string;
  detail?: string;
}

interface CriarAtividadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'audio' | 'text';
}

const materias = ['Matemática', 'Português', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Sociologia', 'Filosofia', 'Inglês', 'Arte', 'Educação Física'];

const CriarAtividadeModal = ({ isOpen, onClose, mode = 'audio' }: CriarAtividadeModalProps) => {
  const [step, setStep] = useState<'audio' | 'preview'>(mode === 'text' ? 'preview' : 'audio');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioMimeRef = useRef('audio/webm');
  const recordingIntervalRef = useRef<number | null>(null);
  const { user } = useAuth();
  const { addAtividade, professorTurmas, professorTurmasError, isLoading } = useData();
  const turmasDisponiveis = professorTurmas.filter(v => v.professorId === user?.id).map(v => v.turma);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    materia: '',
    turmas: [] as string[],
    questoes: [] as Questao[],
  });

  useEffect(() => {
    if (!isOpen) {
      if (recordingIntervalRef.current !== null) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (recorderRef.current) {
        const recorder = recorderRef.current;
        if (recorder.state !== 'inactive') recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
      }
      setIsRecording(false);
      setIsProcessing(false);
      setRecordingTime(0);
      return;
    }

    setStep(mode === 'text' ? 'preview' : 'audio');
    setFormData({ titulo: '', descricao: '', materia: '', turmas: [], questoes: [] });
    setEditingQuestionIndex(null);
  }, [isOpen, mode]);

  useEffect(() => () => {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
    }
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.stream.getTracks().forEach((track) => track.stop());
      if (recorder.state !== 'inactive') recorder.stop();
    }
  }, []);

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast.error('Seu navegador não suporta gravação de áudio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Escolhe um formato suportado pelo navegador
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.start();
      recorderRef.current = recorder;
      audioMimeRef.current = recorder.mimeType || mimeType || 'audio/webm';

      setIsRecording(true);
      toast.success('Gravação iniciada! Fale o conteúdo da atividade.');

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Erro ao acessar microfone:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. Habilite o acesso ao microfone para o site nas configurações do navegador.');
      } else {
        toast.error('Não foi possível acessar o microfone.');
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // remove prefixo "data:audio/webm;base64,"
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);

    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingTime(0);

    const recorder = recorderRef.current;
    if (!recorder) {
      setIsProcessing(false);
      toast.error('Erro interno: gravador não encontrado.');
      return;
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        resolve();
      };
    });

    recorder.stop();
    await stopPromise;

    const mimeType = audioMimeRef.current;
    const audioBlob = new Blob(chunks, { type: mimeType });

    if (audioBlob.size < 1000) {
      setIsProcessing(false);
      toast.error('Áudio muito curto. Grave novamente falando o conteúdo da atividade.');
      return;
    }

    toast.info('Transcrevendo áudio...');

    try {
      const base64Audio = await blobToBase64(audioBlob);

      const transcribeResponse = await fetch('/api/transcrever-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio, mimeType }),
      });

      if (!transcribeResponse.ok) {
        const err = await transcribeResponse.json().catch((): ApiError => ({})) as ApiError;
        console.error('Detalhe do erro de transcrição:', err);
        throw new Error(err.detail ? `${err.error}: ${err.detail}` : (err.error || 'Erro ao transcrever áudio'));
      }

      const { text: transcricao } = await transcribeResponse.json();

      toast.info('Gerando atividade com IA...');

      const response = await fetch('/api/gerar-atividade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcricao }),
      });

      if (!response.ok) {
        const err = await response.json().catch((): ApiError => ({})) as ApiError;
        console.error('Detalhe do erro de geração:', err);
        throw new Error(err.detail ? `${err.error}: ${err.detail}` : (err.error || 'Erro ao gerar atividade'));
      }

      const atividadeGerada = await response.json() as GeneratedActivity;

      const questoesComId: Questao[] = atividadeGerada.questoes.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        enunciado: q.enunciado,
        tipo: q.tipo,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        pontos: q.pontos ?? 10,
      }));

      setFormData({
        titulo: atividadeGerada.titulo || '',
        descricao: atividadeGerada.descricao || '',
        materia: atividadeGerada.materia || '',
        turmas: [],
        questoes: questoesComId,
      });

      setStep('preview');
      toast.success('Atividade gerada com sucesso! Revise antes de publicar.');
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao processar áudio com IA');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const validarVinculos = () => {
    if (isLoading || professorTurmasError) {
      toast.error('Aguarde o carregamento das turmas ou atualize os dados antes de salvar.');
      return false;
    }
    if (formData.turmas.some(turma => !turmasDisponiveis.includes(turma))) {
      toast.error('Os vínculos de turmas mudaram. Atualize os dados antes de salvar.');
      return false;
    }
    return true;
  };

  const handlePublicar = async () => {
    if (!user) return;
    if (!validarVinculos()) return;

    const validationError = validateAtividade(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await addAtividade({
        titulo: formData.titulo,
        descricao: formData.descricao,
        professorId: user.id,
        professorNome: user.name,
        materia: formData.materia,
        turmas: formData.turmas,
        questoes: formData.questoes,
        publicada: true
      });

      toast.success('Atividade publicada com sucesso!');
      setFormData({ titulo: '', descricao: '', materia: '', turmas: [], questoes: [] });
      setStep(mode === 'text' ? 'preview' : 'audio');
      onClose();
    } catch (error) {
      console.error('Erro ao publicar atividade:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao publicar atividade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRascunho = async () => {
    if (!user) return;
    if (!validarVinculos()) return;

    setIsSubmitting(true);
    try {
      await addAtividade({
        titulo: formData.titulo.trim() || 'Rascunho sem título',
        descricao: formData.descricao,
        professorId: user.id,
        professorNome: user.name,
        materia: formData.materia || 'Não definida',
        turmas: formData.turmas,
        questoes: formData.questoes,
        publicada: false
      });

      toast.success('Rascunho salvo com sucesso!');
      setFormData({ titulo: '', descricao: '', materia: '', turmas: [], questoes: [] });
      setStep(mode === 'text' ? 'preview' : 'audio');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar rascunho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'audio'
              ? 'Criar Atividade por Áudio'
              : mode === 'text'
                ? 'Nova Atividade'
                : 'Pré-visualização e Edição'}
          </DialogTitle>
        </DialogHeader>

        {step === 'audio' && (
          <div className="py-8">
            <div className="flex flex-col items-center gap-6">
              {!isRecording && !isProcessing && (
                <>
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center animate-pulse-glow">
                    <Mic className="w-16 h-16 text-primary-foreground" />
                  </div>
                  <p className="text-center text-muted-foreground">
                    Clique no botão abaixo para gravar o conteúdo da atividade. <br />
                    A IA irá transcrever e criar as questões automaticamente.
                  </p>
                  <Button
                    onClick={handleStartRecording}
                    className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Iniciar Gravação
                  </Button>
                </>
              )}

              {isRecording && (
                <>
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center animate-pulse">
                    <MicOff className="w-16 h-16 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground mb-2">
                      {formatTime(recordingTime)}
                    </p>
                    <p className="text-muted-foreground">Gravando...</p>
                  </div>
                  <Button
                    onClick={handleStopRecording}
                    variant="destructive"
                    className="bg-gradient-to-r from-destructive to-red-600"
                  >
                    <MicOff className="w-5 h-5 mr-2" />
                    Parar Gravação
                  </Button>
                </>
              )}

              {isProcessing && (
                <>
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-secondary to-green-500 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground mb-2">
                      Processando com IA
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Transcrevendo áudio e gerando questões...
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg mt-6">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Fale claramente o título, descrição e as questões.
                A IA irá organizar tudo automaticamente.
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
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
                    'Peça ao administrador para atribuir suas turmas. Você pode salvar um rascunho sem turma.'}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {turmasDisponiveis.map(turma => (
                  <Button
                    key={turma}
                    type="button"
                    variant={formData.turmas.includes(turma) ? 'default' : 'outline'}
                    size="sm"
                    disabled={isLoading || Boolean(professorTurmasError) || isSubmitting}
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
              <Button type="button" variant="outline" onClick={handleRascunho} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar como Rascunho'}
              </Button>
              <Button type="button" onClick={handlePublicar} disabled={isSubmitting} className="bg-gradient-to-r from-primary to-primary-glow">
                {isSubmitting ? 'Publicando...' : 'Publicar Atividade'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CriarAtividadeModal;
