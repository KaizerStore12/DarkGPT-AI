let currentModel = 'gpt-oss';

const modelNames = {
    'gpt-oss': '🤖 GPT-OSS 120B',
    'gemma-31b': '🌟 Gemma 4 31B',
    'gemma-26b': '⚡ Gemma 4 26B',
    'owl-alpha': '🦉 Owl Alpha',
    'nemotron': '🎯 Nemotron Super'
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('App started!');
    
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const messagesContainer = document.getElementById('messagesContainer');
    const testModelBtn = document.getElementById('testModelBtn');
    const showModelsBtn = document.getElementById('showModelsBtn');
    const modelList = document.getElementById('modelListContainer');
    const closeModelsBtn = document.getElementById('closeModelsBtn');
    
    // Send message
    sendBtn.onclick = async function() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add user message
        messagesContainer.innerHTML += `<div class="message user"><div class="message-content">${message}</div></div>`;
        messageInput.value = '';
        
        // Show loading
        const loadingId = Date.now();
        messagesContainer.innerHTML += `<div id="msg-${loadingId}" class="message assistant"><div class="message-content">⏳ Mengetik...</div></div>`;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: message,
                    model: currentModel,
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });
            const data = await res.json();
            
            document.getElementById(`msg-${loadingId}`).remove();
            
            if (data.success) {
                let reply = data.message;
                reply = reply.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
                reply = reply.replace(/\n/g, '<br>');
                messagesContainer.innerHTML += `<div class="message assistant"><div class="message-content">${reply}</div></div>`;
            } else {
                messagesContainer.innerHTML += `<div class="message assistant"><div class="message-content">❌ Error: ${data.error}</div></div>`;
            }
        } catch(e) {
            document.getElementById(`msg-${loadingId}`).remove();
            messagesContainer.innerHTML += `<div class="message assistant"><div class="message-content">❌ Network Error: ${e.message}</div></div>`;
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    
    // Enter to send
    messageInput.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.onclick();
        }
    };
    
    // Test model
    testModelBtn.onclick = async function() {
        testModelBtn.disabled = true;
        testModelBtn.innerHTML = '⏳ Testing...';
        try {
            const res = await fetch('/api/test_model', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({model: currentModel})
            });
            const data = await res.json();
            alert(data.success ? '✅ Model is working!' : '❌ Model test failed');
        } catch(e) {
            alert('❌ Error: ' + e.message);
        }
        testModelBtn.disabled = false;
        testModelBtn.innerHTML = '🧪 Test Model';
    };
    
    // Show/hide models list
    showModelsBtn.onclick = function() {
        modelList.style.display = modelList.style.display === 'none' ? 'block' : 'none';
    };
    closeModelsBtn.onclick = function() {
        modelList.style.display = 'none';
    };
    
    // Select model
    document.querySelectorAll('.model-card').forEach(card => {
        card.onclick = function() {
            currentModel = this.dataset.model;
            document.getElementById('currentModelName').innerHTML = modelNames[currentModel];
            document.getElementById('activeModelName').innerHTML = modelNames[currentModel];
            document.querySelector('.model-icon-display').innerHTML = modelNames[currentModel].split(' ')[0];
            modelList.style.display = 'none';
            
            document.querySelectorAll('.model-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        };
    });
    
    // Load system prompt
    fetch('/api/system_prompt')
        .then(res => res.json())
        .then(data => {
            document.getElementById('systemPromptDisplay').innerText = data.system_prompt;
        });
});
