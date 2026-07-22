import axios from 'axios';
import API_BASE_URL from './config';

/**
 * Call the AI proxy endpoint.
 * @param {string} prompt - The user prompt / instruction
 * @param {Array} history - Conversation history as [{role, content}, ...]
 * @param {Object} options - Optional overrides: { maxOutputTokens, systemInstruction }
 * @returns {Promise<string>} The AI response text
 */
export default function callAI(prompt, history = [], options = {}) {
  const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || 'https://generativelanguage.googleapis.com/v1beta/models';
  const apiKey = localStorage.getItem('AI_API_KEY');
  let model = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';
  if (model === 'gemini-2.5-flash') model = 'gemini-1.5-flash';
  
  if (!apiKey) {
    return Promise.reject(new Error('API Key not set. Go to Settings.'));
  }

  const payload = {
    gateway_url: gatewayUrl,
    api_key: apiKey,
    model_name: model,
    prompt: prompt,
    history: history,
    max_output_tokens: options.maxOutputTokens || null,
    system_instruction: options.systemInstruction || null
  };

  return axios.post(`${API_BASE_URL}/ai/proxy`, payload)
    .then(r => r.data)
    .then(data => {
    let text = '';
    if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
    else if (data.candidates?.[0]?.content?.parts) text = data.candidates[0].content.parts.map(p => p.text).join('\n');
    else text = JSON.stringify(data);
    return text;
  }).catch(err => {
    const detail = err.response?.data?.detail;
    if (detail) {
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    throw err;
  });
}
