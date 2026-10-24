import { Atividade, Questao } from '@/types';

export const validateAtividade = (
  atividade: Pick<Atividade, 'titulo' | 'materia' | 'turmas' | 'questoes'>
): string | null => {
  if (!atividade.titulo.trim()) return 'Informe o título da atividade.';
  if (!atividade.materia.trim()) return 'Selecione a matéria.';
  if (atividade.turmas.length === 0) return 'Selecione ao menos uma turma.';
  if (atividade.questoes.length === 0) return 'Adicione ao menos uma questão.';

  for (let index = 0; index < atividade.questoes.length; index += 1) {
    const erroQuestao = validateQuestao(atividade.questoes[index], index);
    if (erroQuestao) return erroQuestao;
  }

  return null;
};

const validateQuestao = (questao: Questao, index: number): string | null => {
  const numero = index + 1;
  if (!questao.enunciado.trim()) return `Informe o enunciado da questão ${numero}.`;
  if (!Number.isFinite(questao.pontos) || questao.pontos <= 0) {
    return `A questão ${numero} precisa ter uma pontuação maior que zero.`;
  }
  if (!questao.gabarito.trim()) return `Informe o gabarito da questão ${numero}.`;

  if (questao.tipo === 'multipla_escolha') {
    const alternativasValidas = (questao.alternativas || [])
      .map((alternativa) => alternativa.trim())
      .filter(Boolean);

    if (alternativasValidas.length < 2) {
      return `A questão ${numero} precisa ter ao menos duas alternativas preenchidas.`;
    }
    if (new Set(alternativasValidas.map((alternativa) => alternativa.toLocaleLowerCase())).size !== alternativasValidas.length) {
      return `Remova alternativas repetidas da questão ${numero}.`;
    }
    if (!alternativasValidas.includes(questao.gabarito.trim())) {
      return `Selecione uma alternativa válida como gabarito da questão ${numero}.`;
    }
  }

  if (questao.tipo === 'verdadeiro_falso') {
    if (!['Verdadeiro', 'Falso'].includes(questao.gabarito.trim())) {
      return `Selecione Verdadeiro ou Falso como gabarito da questão ${numero}.`;
    }
    if (!questao.alternativas?.includes('Verdadeiro') || !questao.alternativas.includes('Falso')) {
      return `As alternativas da questão ${numero} devem ser Verdadeiro e Falso.`;
    }
  }

  return null;
};
