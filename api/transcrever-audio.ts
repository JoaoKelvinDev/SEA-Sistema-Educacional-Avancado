interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): ApiResponse;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const body = isRecord(req.body) ? req.body : {};
  const audio = typeof body.audio === 'string' ? body.audio : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';

  if (!audio) {
    return res.status(400).json({ error: 'Áudio não enviado' });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPGRAM_API_KEY não configurada no servidor' });
  }

  try {
    const buffer = Buffer.from(audio, 'base64');

    if (buffer.length < 1000) {
      return res.status(400).json({ error: 'Áudio muito curto ou vazio' });
    }

    const contentType = mimeType || 'audio/webm';

    const params = new URLSearchParams({
      model: 'nova-3',
      language: 'pt-BR',
      smart_format: 'true',
      punctuate: 'true',
    });

    const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': contentType,
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Deepgram API:', response.status, errText);
      return res.status(502).json({ error: 'Erro ao transcrever áudio', detail: errText, status: response.status });
    }

    const data: unknown = await response.json();
    const results = isRecord(data) && isRecord(data.results) ? data.results : {};
    const channels = Array.isArray(results.channels) ? results.channels : [];
    const firstChannel = isRecord(channels[0]) ? channels[0] : {};
    const alternatives = Array.isArray(firstChannel.alternatives) ? firstChannel.alternatives : [];
    const firstAlternative = isRecord(alternatives[0]) ? alternatives[0] : {};
    const text = typeof firstAlternative.transcript === 'string'
      ? firstAlternative.transcript.trim()
      : '';

    if (!text) {
      return res.status(422).json({ error: 'Não foi possível identificar fala no áudio enviado' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Erro inesperado na transcrição:', err);
    return res.status(500).json({ error: 'Erro interno ao transcrever áudio' });
  }
}
