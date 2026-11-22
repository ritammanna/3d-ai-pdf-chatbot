/**
 * Client Application Logic for AI PDF Chatbot 3D
 */

document.addEventListener('DOMContentLoaded', () => {
  const uploadDropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('pdf-file-input');
  const uploadStatus = document.getElementById('upload-status');
  const uploadProgress = document.getElementById('upload-progress');
  const docInfoCard = document.getElementById('doc-info-card');
  const docName = document.getElementById('doc-name');
  const docPages = document.getElementById('doc-pages');
  const docChunks = document.getElementById('doc-chunks');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const resetBtn = document.getElementById('reset-btn');
  const apiKeyStatus = document.getElementById('api-key-status');
  const pdfModal = document.getElementById('pdf-modal');
  const pdfFrame = document.getElementById('pdf-frame');
  const closePdfModal = document.getElementById('close-pdf-modal');
  const viewPdfBtn = document.getElementById('view-pdf-btn');

  let currentFilename = null;
  let isQuerying = false;
  let timerInterval = null;

  // 1. Initial Status Check
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (data.api_key_configured) {
        apiKeyStatus.innerHTML = `
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-xs text-emerald-300 font-medium">Gemini Connected (${data.model})</span>
        `;
      } else {
        apiKeyStatus.innerHTML = `
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="text-xs text-amber-300 font-medium">Key Missing in .env</span>
        `;
      }

      if (data.loaded_files && data.loaded_files.length > 0) {
        const lastFile = data.loaded_files[data.loaded_files.length - 1];
        showDocInfo(lastFile.filename, lastFile.total_pages, data.total_chunks);
      }
    } catch (err) {
      console.error("Status check failed:", err);
    }
  }

  fetchStatus();

  // 2. Drag and Drop Upload
  uploadDropzone.addEventListener('click', () => fileInput.click());

  uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropzone.classList.add('border-cyan-400', 'bg-cyan-950/20');
  });

  uploadDropzone.addEventListener('dragleave', () => {
    uploadDropzone.classList.remove('border-cyan-400', 'bg-cyan-950/20');
  });

  uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove('border-cyan-400', 'bg-cyan-950/20');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  async function handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Please upload a valid .pdf file.");
      return;
    }

    uploadStatus.classList.remove('hidden');
    uploadProgress.style.width = '35%';
    uploadStatus.querySelector('span').innerText = `Extracting & Indexing ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      uploadProgress.style.width = '65%';
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      uploadProgress.style.width = '100%';
      setTimeout(() => {
        uploadStatus.classList.add('hidden');
        uploadProgress.style.width = '0%';
      }, 600);

      currentFilename = data.filename;
      showDocInfo(data.filename, data.total_pages, data.total_chunks);

      appendSystemMessage(`📄 <b>${data.filename}</b> successfully indexed! (${data.total_pages} pages, ${data.total_chunks} chunks). You can now ask questions.`);
    } catch (err) {
      uploadStatus.classList.add('hidden');
      alert(`Error indexing PDF: ${err.message}`);
    }
  }

  function showDocInfo(name, pages, chunks) {
    currentFilename = name;
    docName.innerText = name;
    docPages.innerText = `${pages} Pages`;
    docChunks.innerText = `${chunks} Chunks`;
    docInfoCard.classList.remove('hidden');
  }

  // 3. Reset Button
  resetBtn.addEventListener('click', async () => {
    if (!confirm("Are you sure you want to clear the loaded document knowledge base?")) return;
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        docInfoCard.classList.add('hidden');
        currentFilename = null;
        appendSystemMessage("🗑️ Knowledge base has been reset. Upload a new PDF to proceed.");
      }
    } catch (err) {
      console.error(err);
    }
  });

  // 4. PDF Modal Viewer
  if (viewPdfBtn) {
    viewPdfBtn.addEventListener('click', () => {
      if (!currentFilename) return;
      openPdfViewer(currentFilename);
    });
  }

  closePdfModal.addEventListener('click', () => {
    pdfModal.classList.add('hidden');
    pdfFrame.src = '';
  });

  function openPdfViewer(filename, pageNumber = 1) {
    pdfFrame.src = `/api/pdf/${encodeURIComponent(filename)}#page=${pageNumber}`;
    pdfModal.classList.remove('hidden');
  }

  // 5. Chat Submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query || isQuerying) return;

    isQuerying = true;
    chatInput.value = '';
    sendBtn.disabled = true;

    // Append User Message
    appendUserMessage(query);

    // 3D Visualizer state
    if (window.hologramScene) window.hologramScene.setQueryingState(true);

    // Thinking Indicator with live stopwatch
    const thinkingId = appendThinkingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const data = await res.json();
      removeThinkingIndicator(thinkingId);

      if (!res.ok) {
        throw new Error(data.detail || "Failed to get answer");
      }

      appendAIMessage(data.answer, data.sources || []);
    } catch (err) {
      removeThinkingIndicator(thinkingId);
      appendErrorMessage(err.message);
    } finally {
      isQuerying = false;
      sendBtn.disabled = false;
      if (window.hologramScene) window.hologramScene.setQueryingState(false);
      chatInput.focus();
    }
  });

  // Helper: Append User Message
  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'flex justify-end mb-4 animate-fade-in';
    el.innerHTML = `
      <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-sky-600 to-indigo-600 p-4 text-white shadow-lg text-sm leading-relaxed">
        ${escapeHtml(text)}
      </div>
    `;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  // Helper: Append Thinking Indicator with Live Stopwatch
  function appendThinkingIndicator() {
    const id = 'thinking-' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = 'flex justify-start mb-4 animate-pulse';
    el.innerHTML = `
      <div class="glass-panel-glow rounded-2xl rounded-tl-sm p-4 text-sm text-sky-300 flex items-center gap-3">
        <svg class="animate-spin h-5 w-5 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span id="${id}-text">Synthesizing answer with Gemini 3.8 Flash (1s)...</span>
      </div>
    `;
    chatMessages.appendChild(el);
    scrollToBottom();

    let seconds = 1;
    timerInterval = setInterval(() => {
      seconds++;
      const timerSpan = document.getElementById(`${id}-text`);
      if (timerSpan) {
        timerSpan.innerText = `Synthesizing answer with Gemini 3.8 Flash (${seconds}s)...`;
      }
    }, 1000);

    return id;
  }

  function removeThinkingIndicator(id) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Helper: Append AI Message with Page Citations
  function appendAIMessage(answer, sources) {
    const el = document.createElement('div');
    el.className = 'flex justify-start mb-6 animate-fade-in w-full';

    const parsedHtml = window.marked ? window.marked.parse(answer) : escapeHtml(answer);

    // Build Citation Badges
    const uniquePages = [...new Set(sources.map(s => s.page))].sort((a, b) => a - b);
    let badgesHtml = '';
    if (uniquePages.length > 0) {
      badgesHtml = `
        <div class="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-400 font-semibold tracking-wider uppercase">Cited Pages:</span>
          ${uniquePages.map(p => `
            <button class="source-badge" data-page="${p}" onclick="window.viewPdfAtPage(${p})">
              <span>📄 Page ${p}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    // Build Collapsible Chunk Inspector
    let inspectorHtml = '';
    if (sources.length > 0) {
      inspectorHtml = `
        <details class="mt-3 group">
          <summary class="cursor-pointer text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1.5 select-none">
            <svg class="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <span>Inspect ${sources.length} Retrieved Source Chunks & Relevance Scores</span>
          </summary>
          <div class="mt-2.5 space-y-2 pt-1">
            ${sources.map((s, idx) => `
              <div class="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
                <div class="flex items-center justify-between mb-1.5 text-slate-400">
                  <span class="font-mono text-sky-400 font-medium">#${idx + 1} - Page ${s.page} (${s.file})</span>
                  <span class="bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                    ${s.score}% Match
                  </span>
                </div>
                <p class="font-mono text-slate-300 line-clamp-3 italic">"${escapeHtml(s.snippet)}"</p>
              </div>
            `).join('')}
          </div>
        </details>
      `;
    }

    el.innerHTML = `
      <div class="max-w-[90%] glass-panel-glow rounded-2xl rounded-tl-sm p-5 text-slate-200 shadow-xl border border-sky-500/20">
        <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/80">
          <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white text-[11px] font-black">
            AI
          </div>
          <span class="text-xs font-bold text-sky-300 uppercase tracking-wider">Aura Document Intelligence</span>
        </div>
        <div class="prose-custom text-sm text-slate-200">
          ${parsedHtml}
        </div>
        ${badgesHtml}
        ${inspectorHtml}
      </div>
    `;

    chatMessages.appendChild(el);
    scrollToBottom();
  }

  window.viewPdfAtPage = (pageNum) => {
    if (currentFilename) {
      openPdfViewer(currentFilename, pageNum);
    }
  };

  function appendErrorMessage(errText) {
    const el = document.createElement('div');
    el.className = 'flex justify-start mb-4';
    el.innerHTML = `
      <div class="max-w-[85%] bg-rose-950/70 border border-rose-500/40 rounded-xl p-4 text-xs text-rose-200">
        <b>Error:</b> ${escapeHtml(errText)}
      </div>
    `;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function appendSystemMessage(htmlText) {
    const el = document.createElement('div');
    el.className = 'flex justify-center my-3';
    el.innerHTML = `
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-full px-4 py-1.5 text-xs text-slate-300">
        ${htmlText}
      </div>
    `;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // Quick Chips Click
  window.sendQuickPrompt = (promptText) => {
    if (isQuerying) return;
    chatInput.value = promptText;
    chatForm.dispatchEvent(new Event('submit'));
  };
});