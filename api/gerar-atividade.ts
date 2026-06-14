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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { transcricao } = req.body as { transcricao?: string };

  if (!transcricao || transcricao.trim().length < 5) {
    return res.status(400).json({ error: 'Transcrição vazia ou muito curta' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Transcrição do professor:\n\n"${transcricao}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Anthropic API:', errText);
      return res.status(502).json({ error: 'Erro ao chamar a IA' });
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    const rawText: string = textBlock?.text ?? '';

    // Remove possíveis blocos de markdown ```json ... ```
    const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();

    let atividadeGerada;
    try {
      atividadeGerada = JSON.parse(cleaned);
    } catch (e) {
      console.error('Falha ao parsear JSON da IA:', rawText);
      return res.status(502).json({ error: 'A IA retornou um formato inválido' });
    }

    return res.status(200).json(atividadeGerada);
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar atividade' });
  }
}
