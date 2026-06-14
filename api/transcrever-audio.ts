export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { audio, mimeType } = req.body as { audio?: string; mimeType?: string };

  if (!audio) {
    return res.status(400).json({ error: 'Áudio não enviado' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor' });
  }

  try {
    const buffer = Buffer.from(audio, 'base64');

    if (buffer.length < 1000) {
      return res.status(400).json({ error: 'Áudio muito curto ou vazio' });
    }

    const extension = (mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
    const audioBlob = new Blob([buffer], { type: mimeType || 'audio/webm' });

    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Whisper API:', errText);
      return res.status(502).json({ error: 'Erro ao transcrever áudio' });
    }

    const data = await response.json();
    const text: string = (data.text || '').trim();

    if (!text) {
      return res.status(422).json({ error: 'Não foi possível identificar fala no áudio enviado' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Erro inesperado na transcrição:', err);
    return res.status(500).json({ error: 'Erro interno ao transcrever áudio' });
  }
}
