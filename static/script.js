// ============================================
// OPENROUTER AI WEBUI SCRIPT - FIXED VERSION
// ============================================

// Global variables
let currentModel = 'gpt-oss';
let conversationHistory = [];
let isWaitingResponse = false;

// Model mapping
const modelNames = {
    'gpt-oss': { name: 'GPT-OSS 120B', icon: '🤖' },
    'gemma-31b': { name: 'Gemma 4 31B', icon: '🌟' },
    'gemma-26b': { name: 'Gemma 4 26B', icon: '⚡' },
    'owl-alpha': { name: 'Owl Alpha', icon: '🦉' },
    'nemotron': { name: 'Nemotron Super', icon: '🎯' }
};

// DOM Elements (akan diisi setelah DOM ready)
let messagesContainer, messageInput, sendBtn, testModelBtn, temperatureSlider, tempValue;
let maxTokensSlider, tokensValue, typingIndicator, charCount, currentModelName;
let activeModelNameSpan, apiStatus, systemPromptDisplay, showModelsBtn, clearChatMenuBtn;
let newChatMenuBtn, modelListContainer, closeModelsBtn, sidebarToggle, sidebar;
let welcomeMessage, closeWelcomeBtn;

// ========== FUNCTIONS ==========

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px; color: #28a745;"></i> ${escapeHtml(message)}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function formatCodeBlocks(text) {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let formattedText = text;
    const codeBlocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        codeBlocks.push({ language: match[1] || 'plaintext', code: match[2], original: match[0] });
    }
    
    for (const block of codeBlocks) {
        const encodedCode = escapeHtml(block.code);
        formattedText = formattedText.replace(block.original, `<pre><code class="language-${block.language}">${encodedCode}</code></pre>`);
    }
    
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    return formattedText;
}

function updateModelUI() {
    if (currentModelName) {
        currentModelName.textContent = `${modelNames[currentModel].icon} ${modelNames[currentModel].name}`;
    }
    if (activeModelNameSpan) {
        activeModelNameSpan.textContent = modelNames[currentModel].name;
    }
    const iconDisplay = document.querySelector('.model-icon-display');
    if (iconDisplay) {
        iconDisplay.textContent = modelNames[currentModel].icon;
    }
    
    document.querySelectorAll('.model-card').forEach(card => {
        if (card.dataset.model === currentModel) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function saveConversation() {
    localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
    localStorage.setItem('current_model', currentModel);
}

function loadConversation() {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
        try {
            conversationHistory = JSON.parse(saved);
            renderMessages();
        } catch(e) { console.error('Failed to parse history', e); }
    }
    const savedModel = localStorage.getItem('current_model');
    if (savedModel && modelNames[savedModel]) {
        currentModel = savedModel;
        updateModelUI();
    }
}

function closeModelList() {
    if (modelListContainer) modelListContainer.style.display = 'none';
}

function toggleModelList() {
    if (modelListContainer) {
        if (modelListContainer.style.display === 'none' || modelListContainer.style.display === '') {
            modelListContainer.style.display = 'block';
        } else {
            modelListContainer.style.display = 'none';
        }
    }
}

function closeWelcomeMsg() {
    if (welcomeMessage) {
        welcomeMessage.classList.add('hidden');
        localStorage.setItem('welcome_closed', 'true');
        showToast('Petunjuk ditutup');
    }
}

function renderMessages() {
    if (!messagesContainer) return;
    
    if (conversationHistory.length === 0) {
        // Welcome message sudah ada di HTML, tidak perlu diganti
        return;
    }
    
    messagesContainer.innerHTML = '';
    conversationHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role}`;
        const time = new Date(msg.timestamp).toLocaleTimeString();
        let content = msg.content;
        
        if (msg.role === 'assistant') {
            content = formatCodeBlocks(msg.content);
        } else {
            content = escapeHtml(msg.content).replace(/\n/g, '<br>');
        }
        
        messageDiv.innerHTML = `<div class="message-content">${content}<div class="message-time">${time}</div></div>`;
        messagesContainer.appendChild(messageDiv);
    });
    
    // Apply syntax highlighting to code blocks
    document.querySelectorAll('pre code').forEach((block) => {
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(block);
        }
        const pre = block.parentElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(block.textContent);
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy', 2000);
        };
        wrapper.appendChild(copyBtn);
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadSystemPrompt() {
    if (!systemPromptDisplay) return;
    try {
        const response = await fetch('/api/system_prompt');
        const data = await response.json();
        systemPromptDisplay.textContent = data.system_prompt || 'No system prompt set';
    } catch (error) {
        console.error('Failed to load system prompt:', error);
        systemPromptDisplay.textContent = 'Failed to load system prompt';
    }
}

function showError(errorMsg) {
    if (!messagesContainer) return;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant';
    errorDiv.innerHTML = `<div class="message-content" style="background: rgba(220, 53, 69, 0.15); border-color: #dc3545;">❌ Error: ${escapeHtml(errorMsg)}<div class="message-time">${new Date().toLocaleTimeString()}</div></div>`;
    messagesContainer.appendChild(errorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    if (apiStatus) {
        apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #dc3545;"></i> Error';
        setTimeout(() => {
            if (apiStatus) apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #28a745;"></i> API Ready';
        }, 3000);
    }
}

async function sendMessage() {
    if (isWaitingResponse) return;
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    const userMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
    conversationHistory.push(userMessage);
    renderMessages();
    
    messageInput.value = '';
    if (charCount) charCount.textContent = '0 karakter';
    
    isWaitingResponse = true;
    if (typingIndicator) typingIndicator.style.display = 'flex';
    if (sendBtn) sendBtn.disabled = true;
    if (apiStatus) apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #ffc107;"></i> Processing...';
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                model: currentModel,
                temperature: temperatureSlider ? parseFloat(temperatureSlider.value) : 0.7,
                max_tokens: maxTokensSlider ? parseInt(maxTokensSlider.value) : 2000,
                history: conversationHistory.slice(0, -1)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const assistantMessage = { role: 'assistant', content: data.message, timestamp: new Date().toISOString() };
            conversationHistory.push(assistantMessage);
            renderMessages();
            saveConversation();
            if (apiStatus) apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #28a745;"></i> API Ready';
        } else {
            showError(data.error || 'Failed to get response');
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    } finally {
        isWaitingResponse = false;
        if (typingIndicator) typingIndicator.style.display = 'none';
        if (sendBtn) sendBtn.disabled = false;
    }
}

async function testModel() {
    if (!testModelBtn) return;
    testModelBtn.disabled = true;
    testModelBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Testing...';
    try {
        const response = await fetch('/api/test_model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: currentModel })
        });
        const data = await response.json();
        if (data.success) {
            showError(`✅ ${modelNames[currentModel].name} is working!`);
        } else {
            showError('❌ Test failed');
        }
    } catch (error) {
        showError('Test failed: ' + error.message);
    } finally {
        testModelBtn.disabled = false;
        testModelBtn.innerHTML = '<i class="fas fa-vial"></i> Test Model';
    }
}

function clearHistory() {
    if (confirm('Hapus semua percakapan?')) {
        conversationHistory = [];
        renderMessages();
        saveConversation();
        showToast('Chat history cleared');
    }
}

function newChat() {
    if (conversationHistory.length > 0 && confirm('Mulai chat baru?')) {
        conversationHistory = [];
        renderMessages();
        saveConversation();
        showToast('New chat started');
    }
}

function updateCharCount() {
    if (charCount && messageInput) {
        charCount.textContent = messageInput.value.length + ' karakter';
    }
}

// ========== INITIALIZE ALL EVENT LISTENERS ==========
function initApp() {
    console.log('Initializing OpenRouter WebUI...');
    
    // Get DOM elements
    messagesContainer = document.getElementById('messagesContainer');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    testModelBtn = document.getElementById('testModelBtn');
    temperatureSlider = document.getElementById('temperature');
    tempValue = document.getElementById('tempValue');
    maxTokensSlider = document.getElementById('maxTokens');
    tokensValue = document.getElementById('tokensValue');
    typingIndicator = document.getElementById('typingIndicator');
    charCount = document.getElementById('charCount');
    currentModelName = document.getElementById('currentModelName');
    activeModelNameSpan = document.getElementById('activeModelName');
    apiStatus = document.getElementById('apiStatus');
    systemPromptDisplay = document.getElementById('systemPromptDisplay');
    showModelsBtn = document.getElementById('showModelsBtn');
    clearChatMenuBtn = document.getElementById('clearChatMenuBtn');
    newChatMenuBtn = document.getElementById('newChatMenuBtn');
    modelListContainer = document.getElementById('modelListContainer');
    closeModelsBtn = document.getElementById('closeModelsBtn');
    sidebarToggle = document.getElementById('sidebarToggle');
    sidebar = document.getElementById('sidebar');
    welcomeMessage = document.getElementById('welcomeMessage');
    closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
    
    console.log('Elements found:', {
        sendBtn: !!sendBtn,
        messageInput: !!messageInput,
        testModelBtn: !!testModelBtn
    });
    
    // Setup event listeners
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        console.log('Send button listener added');
    }
    
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        messageInput.addEventListener('input', updateCharCount);
    }
    
    if (testModelBtn) {
        testModelBtn.addEventListener('click', testModel);
    }
    
    if (temperatureSlider && tempValue) {
        temperatureSlider.addEventListener('input', () => {
            tempValue.textContent = temperatureSlider.value;
        });
    }
    
    if (maxTokensSlider && tokensValue) {
        maxTokensSlider.addEventListener('input', () => {
            tokensValue.textContent = maxTokensSlider.value;
        });
    }
    
    if (showModelsBtn) {
        showModelsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleModelList();
        });
    }
    
    if (closeModelsBtn) {
        closeModelsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModelList();
        });
    }
    
    if (clearChatMenuBtn) {
        clearChatMenuBtn.addEventListener('click', clearHistory);
    }
    
    if (newChatMenuBtn) {
        newChatMenuBtn.addEventListener('click', newChat);
    }
    
    if (closeWelcomeBtn) {
        closeWelcomeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeWelcomeMsg();
        });
    }
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
    
    // Model card selection
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => {
            currentModel = card.dataset.model;
            updateModelUI();
            saveConversation();
            closeModelList();
            showToast(`Model changed to ${modelNames[currentModel].name}`);
        });
    });
    
    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (messageInput) {
                messageInput.value = btn.dataset.prompt;
                updateCharCount();
                messageInput.focus();
            }
        });
    });
    
    // Click outside to close model list
    document.addEventListener('click', (e) => {
        if (modelListContainer && modelListContainer.style.display === 'block') {
            if (modelListContainer && !modelListContainer.contains(e.target) && showModelsBtn && !showModelsBtn.contains(e.target)) {
                closeModelList();
            }
        }
    });
    
    if (modelListContainer) {
        modelListContainer.addEventListener('click', (e) => e.stopPropagation());
    }
    
    // Check welcome message closed status
    if (localStorage.getItem('welcome_closed') === 'true' && welcomeMessage) {
        welcomeMessage.classList.add('hidden');
    }
    
    // Load data
    loadSystemPrompt();
    loadConversation();
    updateCharCount();
    updateModelUI();
    
    console.log('OpenRouter WebUI initialized successfully!');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
