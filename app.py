from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = os.urandom(24)
CORS(app)

API_KEY = "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"
BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

FREE_MODELS = {
    "gpt-oss": {
        "id": "openai/gpt-oss-120b:free",
        "name": "🤖 GPT-OSS 120B",
        "icon": "🤖",
        "description": "OpenAI GPT OSS 120B",
        "context": "120K token"
    },
    "gemma-31b": {
        "id": "google/gemma-4-31b-it:free",
        "name": "🌟 Gemma 4 31B",
        "icon": "🌟",
        "description": "Google DeepMind 31B",
        "context": "256K token"
    },
    "gemma-26b": {
        "id": "google/gemma-4-26b-a4b-it:free",
        "name": "⚡ Gemma 4 26B",
        "icon": "⚡",
        "description": "Google DeepMind MoE 26B",
        "context": "262K token"
    },
    "owl-alpha": {
        "id": "openrouter/owl-alpha",
        "name": "🦉 Owl Alpha",
        "icon": "🦉",
        "description": "Flagship OpenRouter",
        "context": "1M token"
    },
    "nemotron": {
        "id": "nvidia/nemotron-3-super-120b-a12b:free",
        "name": "🎯 Nemotron Super",
        "icon": "🎯",
        "description": "NVIDIA 120B",
        "context": "256K token"
    }
}

def load_system_prompt():
    try:
        with open('system_prompt.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('system_prompt', "Kamu adalah asisten AI yang membantu dan ramah.")
    except FileNotFoundError:
        return "Kamu adalah asisten AI yang membantu dan ramah."

@app.route('/')
def index():
    return render_template('index.html', models=FREE_MODELS)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        model_key = data.get('model', 'gpt-oss')
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens', 2000)
        history = data.get('history', [])
        
        model_id = FREE_MODELS.get(model_key, FREE_MODELS['gpt-oss'])['id']
        system_prompt = load_system_prompt()
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if history:
            messages.extend(history[-15:])
        messages.append({"role": "user", "content": user_message})
        
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.environ.get('RENDER_EXTERNAL_URL', 'https://openrouter-webui.onrender.com'),
            "X-OpenRouter-Title": "OpenRouter WebUI"
        }
        
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        response = requests.post(BASE_URL, headers=headers, json=payload, timeout=90)
        
        if response.status_code == 200:
            result = response.json()
            assistant_message = result['choices'][0]['message']['content']
            return jsonify({'success': True, 'message': assistant_message})
        else:
            return jsonify({'success': False, 'error': f'API Error: {response.status_code}'}), response.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/system_prompt', methods=['GET'])
def get_system_prompt():
    return jsonify({'system_prompt': load_system_prompt()})

@app.route('/api/test_model', methods=['POST'])
def test_model():
    try:
        data = request.json
        model_key = data.get('model', 'gpt-oss')
        model_id = FREE_MODELS.get(model_key, FREE_MODELS['gpt-oss'])['id']
        
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_id,
            "messages": [{"role": "user", "content": "Say OK"}],
            "max_tokens": 5
        }
        
        response = requests.post(BASE_URL, headers=headers, json=payload, timeout=30)
        return jsonify({'success': response.status_code == 200})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("\n" + "="*50)
    print("🚀 OpenRouter AI WebUI Started!")
    print("="*50)
    print(f"📱 Open in browser: http://localhost:{port}")
    print("="*50 + "\n")
    app.run(debug=False, host='0.0.0.0', port=port)
