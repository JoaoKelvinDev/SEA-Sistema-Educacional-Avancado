const SYSTEM_PROMPT = `Você é um assistente pedagógico especializado em criar atividades escolares para o Ensino Médio brasileiro, alinhadas à BNCC e ao estilo de questões do ENEM.

A partir da transcrição de um professor descrevendo o que ele quer (matéria, turma, tema, tipos de questão), gere uma atividade completa.

Responda APENAS com um JSON válido, sem texto adicional, sem markdown, no formato exato:

{
  "titulo": "string - título curto da atividade",
  "descricao": "string - descrição/objetivo da atividade",
  "materia": "string - uma das opções: Matemática, Português, Física, Química, Biologia, Geografia, História, Sociologia, Filosofia, Inglês, Arte, Educação Física",
  "questoes": [
    {
      "enunciado": "string",
      "tipo": "multipla_escolha" | "dissertativa" | "verdadeiro_falso",
      "alternativas": ["string", "string", "string", "string"] (apenas para multipla_escolha, omitir para os demais tipos, para verdadeiro_falso usar ["Verdadeiro", "Falso"]),
      "gabarito": "string - deve ser exatamente igual a uma das alternativas para multipla_escolha/verdadeiro_falso, ou a resposta esperada para dissertativa",
      "pontos": number
    }
  ]
}

Regras:
- Se o professor não especificar a quantidade de questões, gere 3.
- Se não especificar os tipos, varie entre múltipla escolha e dissertativa.
- Sempre gere questões com conteúdo correto e gabaritos coerentes.
- Adapte a linguagem e os exemplos à realidade escolar brasileira.`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): ApiResponse;
}

const isGeneratedActivity = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    typeof value.titulo !== 'string' ||
    !value.titulo.trim() ||
    typeof value.descricao !== 'string' ||
    typeof value.materia !== 'string' ||
    !value.materia.trim() ||
    !Array.isArray(value.questoes) ||
    value.questoes.length === 0
  ) {
    return false;
  }

  return value.questoes.every((questao) => {
    if (
      !isRecord(questao) ||
      typeof questao.enunciado !== 'string' ||
      !questao.enunciado.trim() ||
      typeof questao.gabarito !== 'string' ||
      !questao.gabarito.trim() ||
      typeof questao.pontos !== 'number' ||
      !Number.isFinite(questao.pontos) ||
      questao.pontos <= 0
    ) {
      return false;
    }

    if (questao.tipo === 'multipla_escolha') {
      return Array.isArray(questao.alternativas) &&
        questao.alternativas.length >= 2 &&
        questao.alternativas.every((alternativa) => typeof alternativa === 'string' && alternativa.trim()) &&
        questao.alternativas.includes(questao.gabarito);
    }

    if (questao.tipo === 'verdadeiro_falso') {
      return Array.isArray(questao.alternativas) &&
        questao.alternativas.includes('Verdadeiro') &&
        questao.alternativas.includes('Falso') &&
        ['Verdadeiro', 'Falso'].includes(questao.gabarito);
    }

    return questao.tipo === 'dissertativa';
  });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const body = isRecord(req.body) ? req.body : {};
  const transcricao = typeof body.transcricao === 'string' ? body.transcricao : '';

  if (transcricao.trim().length < 5) {
    return res.status(400).json({ error: 'Transcrição vazia ou muito curta' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Transcrição do professor:\n\n"${transcricao}"` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Gemini API:', response.status, errText);
      return res.status(502).json({ error: 'Erro ao chamar a IA', detail: errText, status: response.status });
    }

    const data: unknown = await response.json();
    const candidates = isRecord(data) && Array.isArray(data.candidates) ? data.candidates : [];
    const candidate = isRecord(candidates[0]) ? candidates[0] : {};
    const content = isRecord(candidate.content) ? candidate.content : {};
    const parts = Array.isArray(content.parts) ? content.parts : [];
    const firstPart = isRecord(parts[0]) ? parts[0] : {};
    const rawText = typeof firstPart.text === 'string' ? firstPart.text : '';

    const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();

    let atividadeGerada: unknown;
    try {
      atividadeGerada = JSON.parse(cleaned);
    } catch (e) {
      console.error('Falha ao parsear JSON da IA:', rawText);
      return res.status(502).json({ error: 'A IA retornou um formato inválido' });
    }

    if (!isGeneratedActivity(atividadeGerada)) {
      console.error('A IA retornou uma atividade com campos inválidos.');
      return res.status(502).json({ error: 'A IA retornou uma atividade incompleta ou inválida' });
    }

    return res.status(200).json(atividadeGerada);
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar atividade' });
  }
}
