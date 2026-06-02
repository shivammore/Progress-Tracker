export default function callAI(prompt, history = []) {
  const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
  const apiKey = localStorage.getItem('AI_API_KEY');
  let model = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';
  if (model === 'gemini-2.5-flash') model = 'gemini-1.5-flash';
  
  if (!apiKey) {
    return Promise.reject(new Error('API Key not set. Go to Settings.'));
  }

  let url, headers, body;
  if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
    url = `${gatewayUrl.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    body = { contents };
  } else {
    url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
    headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    const messages = history.map(msg => ({ role: msg.role === 'model' ? 'assistant' : msg.role, content: msg.content }));
    messages.push({ role: 'user', content: prompt });
    body = { model, messages, temperature: 0.7 };
  }

  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    .then(r => {
      if (!r.ok) {
        return r.text().then(t => { throw new Error(`HTTP ${r.status}: ${t}`); });
      }
      return r.json();
    })
    .then(data => {
      let text = '';
      if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
      else if (data.candidates?.[0]?.content?.parts) text = data.candidates[0].content.parts.map(p => p.text).join('\n');
      else text = JSON.stringify(data);
      return text;
    });
}
