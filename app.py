from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__)
CORS(app)

API_KEY = "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"
BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

FREE_MODELS = {
    "gpt-oss": {"id": "openai/gpt-oss-120b:free", "name": "🤖 GPT-OSS 120B", "icon": "🤖"},
    "gemma-31b": {"id": "google/gemma-4-31b-it:free", "name": "🌟 Gemma 4 31B", "icon": "🌟"},
    "gemma-26b": {"id": "google/gemma-4-26b-a4b-it:free", "name": "⚡ Gemma 4 26B", "icon": "⚡"},
    "owl-alpha": {"id": "openrouter/owl-alpha", "name": "🦉 Owl Alpha", "icon": "🦉"},
    "nemotron": {"id": "nvidia/nemotron-3-super-120b-a12b:free", "name": "🎯 Nemotron Super", "icon": "🎯"}
}

def load_system_prompt():
    try:
        with open('system_prompt.json', 'r') as f:
            return json.load(f).get('system_prompt', 'Kamu adalah asisten AI yang membantu.')
    except:
        return 'Kamu adalah asisten AI yang membantu.'

@app.route('/')
def index():
    return render_template('index.html', models=FREE_MODELS)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        messages = []
        system_prompt = load_system_prompt()
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": data.get('message', '')})
        
        response = requests.post(BASE_URL, headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }, json={
            "model": FREE_MODELS.get(data.get('model', 'gpt-oss'), FREE_MODELS['gpt-oss'])['id'],
            "messages": messages,
            "temperature": data.get('temperature', 0.7),
            "max_tokens": data.get('max_tokens', 2000)
        }, timeout=60)
        
        if response.status_code == 200:
            return jsonify({"success": True, "message": response.json()['choices'][0]['message']['content']})
        return jsonify({"success": False, "error": f"API Error: {response.status_code}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/system_prompt', methods=['GET'])
def get_system_prompt():
    return jsonify({"system_prompt": load_system_prompt()})

@app.route('/api/test_model', methods=['POST'])
def test_model():
    try:
        data = request.get_json()
        model_id = FREE_MODELS.get(data.get('model', 'gpt-oss'), FREE_MODELS['gpt-oss'])['id']
        response = requests.post(BASE_URL, headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }, json={
            "model": model_id,
            "messages": [{"role": "user", "content": "Say OK"}],
            "max_tokens": 5
        }, timeout=30)
        return jsonify({"success": response.status_code == 200})
    except:
        return jsonify({"success": False})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
