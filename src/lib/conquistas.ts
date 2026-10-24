import { Atividade, RespostaAluno } from '@/types';

export const getConquistasDesbloqueadas = (
  respostas: RespostaAluno[],
  atividades: Atividade[]
): Set<string> => {
  const desbloqueadas = new Set<string>();
  const atividadesConcluidas = new Set(respostas.map((resposta) => resposta.atividadeId));

  if (atividadesConcluidas.size >= 1) desbloqueadas.add('primeira-atividade');
  if (atividadesConcluidas.size >= 10) desbloqueadas.add('10-atividades');

  const atividadePorId = new Map(atividades.map((atividade) => [atividade.id, atividade]));
  const materias = new Map<string, { pontos: number; possiveis: number }>();
  let notaMaxima = false;

  for (const resposta of respostas) {
    const atividade = atividadePorId.get(resposta.atividadeId);
    if (!atividade) continue;

    const pontosPossiveis = atividade.questoes.reduce((total, questao) => total + questao.pontos, 0);
    const pontosObtidos = resposta.pontuacao || 0;
    if (pontosPossiveis > 0 && pontosObtidos === pontosPossiveis) {
      notaMaxima = true;
    }

    const desempenho = materias.get(atividade.materia) || { pontos: 0, possiveis: 0 };
    desempenho.pontos += pontosObtidos;
    desempenho.possiveis += pontosPossiveis;
    materias.set(atividade.materia, desempenho);
  }

  if (notaMaxima) desbloqueadas.add('nota-maxima');
  if ([...materias.values()].some(({ pontos, possiveis }) => possiveis > 0 && pontos / possiveis >= 0.9)) {
    desbloqueadas.add('especialista');
  }

  const diasConsecutivos = new Set(
    respostas
      .map((resposta) => new Date(resposta.dataEnvio))
      .filter((data) => !Number.isNaN(data.getTime()))
      .map((data) => Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()))
  );
  const diasOrdenados = [...diasConsecutivos].sort((a, b) => a - b);
  let sequenciaAtual = 0;
  let sequenciaMaxima = 0;

  for (let index = 0; index < diasOrdenados.length; index += 1) {
    sequenciaAtual = index > 0 && diasOrdenados[index] - diasOrdenados[index - 1] === 86400000
      ? sequenciaAtual + 1
      : 1;
    sequenciaMaxima = Math.max(sequenciaMaxima, sequenciaAtual);
  }

  if (sequenciaMaxima >= 7) desbloqueadas.add('sequencia-7');
  return desbloqueadas;
};
