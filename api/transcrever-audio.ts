export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { audio, mimeType } = req.body as { audio?: string; mimeType?: string };

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

    const data = (await response.json()) as any;
    const text: string = (
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    ).trim();

    if (!text) {
      return res.status(422).json({ error: 'Não foi possível identificar fala no áudio enviado' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Erro inesperado na transcrição:', err);
    return res.status(500).json({ error: 'Erro interno ao transcrever áudio' });
  }
}
