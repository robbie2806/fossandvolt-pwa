const $ = sel => document.querySelector(sel);
const messages = $('#messages');
const input = $('#input');
const form = $('#composer');
const photo = $('#photo');
const preview = $('#preview');
const previewImg = $('#previewImg');
const clearImg = $('#clearImg');

let attachedDataUrl = null;

function pushMessage(text, who='me', img=null){
  const li = document.createElement('li');
  li.className = `msg ${who}`;
  li.innerHTML = `
    <div>${text ? sanitize(text) : ''}</div>
    ${img ? `<img class="attachment" src="${img}" alt="attachment">` : ''}
    <div class="meta">${who==='me'?'You':'Volt'} • ${new Date().toLocaleTimeString()}</div>
  `;
  messages.appendChild(li);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function sanitize(t){ return t.replace(/[<>&]/g, s=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[s])) }

photo.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    attachedDataUrl = reader.result;
    previewImg.src = attachedDataUrl;
    preview.hidden = false;
  };
  reader.readAsDataURL(file);
});

clearImg.addEventListener('click', () => {
  attachedDataUrl = null;
  photo.value = '';
  preview.hidden = true;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text && !attachedDataUrl) return;
  pushMessage(text || '(photo)', 'me', attachedDataUrl);
  input.value = '';

  // Call Netlify function
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, image: attachedDataUrl })
    });
    const data = await r.json();
    pushMessage(data.reply || 'No reply', 'bot', data.echoImage || null);
  } catch (err){
    pushMessage('Network error. Try again.', 'bot');
  } finally {
    // clear image after send
    attachedDataUrl = null;
    preview.hidden = true;
  }
});
