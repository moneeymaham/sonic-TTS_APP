// popup.js


    // UI Elements
    const ttsTextarea = document.getElementById('tts-text');
    const playButton = document.getElementById('play-button');
    const playTextSpan = document.getElementById('play-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    const statusMessage = document.getElementById('status-message');
    const voiceSelect = document.getElementById('voice-select');
    const multiSpeakerToggle = document.getElementById('multi-speaker-toggle');
    const continueButton = document.getElementById('continue-button');
    const summarizeButton = document.getElementById('summarize-button');

    // Settings keys and endpoints
    const PROVIDER_KEY = 'model-provider';
    const API_KEY_KEY = 'api-key';
    const GEMINI_TTS_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
    const GEMINI_LLM_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
    const OPENAI_TTS_API_URL = 'https://api.openai.com/v1/audio/speech';
    const OPENAI_LLM_API_URL = 'https://api.openai.com/v1/chat/completions';

    // Voices and their names
    const voices = [
        { name: "Zephyr", description: "Bright" },
        { name: "Puck", description: "Upbeat" },
        { name: "Charon", description: "Informative" },
        { name: "Kore", description: "Firm" },
        { name: "Fenrir", description: "Excitable" },
        { name: "Leda", description: "Youthful" },
        { name: "Orus", description: "Firm" },
        { name: "Aoede", description: "Breezy" },
        { name: "Callirrhoe", description: "Easy-going" },
        { name: "Autonoe", description: "Bright" },
        { name: "Enceladus", description: "Breathy" },
        { name: "Iapetus", description: "Clear" },
        { name: "Umbriel", description: "Easy-going" },
        { name: "Algieba", description: "Smooth" },
        { name: "Despina", description: "Smooth" },
        { name: "Erinome", description: "Clear" },
        { name: "Algenib", description: "Gravelly" },
        { name: "Rasalgethi", description: "Informative" },
        { name: "Laomedeia", description: "Upbeat" },
        { name: "Achernar", description: "Soft" },
        { name: "Alnilam", description: "Firm" },
        { name: "Schedar", description: "Even" },
        { name: "Gacrux", description: "Mature" },
        { name: "Pulcherrima", description: "Forward" },
        { name: "Achird", description: "Friendly" },
        { name: "Zubenelgenubi", description: "Casual" },
        { name: "Vindemiatrix", description: "Gentle" },
        { name: "Sadachbia", description: "Lively" },
        { name: "Sadaltager", description: "Knowledgeable" },
        { name: "Sulafat", description: "Warm" }
    ];

    function populateVoices() {
        voiceSelect.innerHTML = '';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.description})`;
            voiceSelect.appendChild(option);
        });
    }

    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700', 'bg-gray-100', 'text-gray-700');
        if (type === 'error') {
            statusMessage.classList.add('bg-red-100', 'text-red-700');
        } else if (type === 'success') {
            statusMessage.classList.add('bg-green-100', 'text-green-700');
        
            statusMessage.classList.add('bg-gray-100', 'text-gray-700');
        }
        statusMessage.classList.remove('hidden');
    }

    function toggleLoading(button, textSpan, spinner, isLoading) {
        if (isLoading) {
            button.disabled = true;
            textSpan.classList.add('hidden');
            spinner.classList.remove('hidden');
        
            button.disabled = false;
            textSpan.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    async function retryWithBackoff(func, maxRetries = 5, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await func();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function pcmToWav(pcm16, sampleRate) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        const dataLength = pcm16.length * 2;
        const wavData = new ArrayBuffer(44 + dataLength);
        const view = new DataView(wavData);
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        let offset = 44;
        for (let i = 0; i < pcm16.length; i++, offset += 2) {
            view.setInt16(offset, pcm16[i], true);
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    async function getApiKey() {
        return Promise.resolve(localStorage.getItem(API_KEY_KEY) || null);
    }

    async function speakText() {
        const text = ttsTextarea.value.trim();
        const apiKey = await getApiKey();
        const provider = localStorage.getItem(PROVIDER_KEY) || 'gemini';
        if (!text || !apiKey) {
            showStatus('Please enter some text and your API key.', 'error');
            return;
        }
        toggleLoading(playButton, playTextSpan, loadingSpinner, true);
        showStatus('Generating speech...', 'info');
        const isMultiSpeaker = multiSpeakerToggle.checked;
        const selectedVoice = voiceSelect.value;
        try {
            let response, audioUrl, audio;
            if (provider === 'openai') {
                const payload = {
                    model: 'tts-1',
                    input: text,
                    voice: selectedVoice || 'alloy',
                    response_format: 'mp3'
                };
                response = await retryWithBackoff(() => fetch(OPENAI_TTS_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                }));
                if (!response.ok) {
                    let errorMsg = `OpenAI API call failed with status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        if (errorData?.error?.message) errorMsg = errorData.error.message;
                    } catch {}
                    throw new Error(errorMsg);
                }
                const blob = await response.blob();
                audioUrl = URL.createObjectURL(blob);
                audio = new Audio(audioUrl);
            } else {
                const payload = {
                    contents: [{
                        parts: [{ text: text }]
                    }],
                    generationConfig: {
                        speechConfig: isMultiSpeaker
                            ? {
                                multiSpeakerVoiceConfig: {
                                    speakerVoiceConfigs: [
                                        { speaker: "Speaker1", voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                                        { speaker: "Speaker2", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                                    ]
                                }
                            }
                            : {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: selectedVoice }
                                }
                            }
                    },
                    model: "gemini-2.5-flash-preview-tts"
                };
                response = await retryWithBackoff(() => fetch(`${GEMINI_TTS_API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }));
                if (!response.ok) {
                    let errorMsg = `Gemini API call failed with status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        if (errorData?.error?.message) errorMsg = errorData.error.message;
                        if (errorMsg.includes('combination of response modalities')) {
                            errorMsg = 'The selected model only supports AUDIO output. Please ensure you are using the TTS feature, not text generation.';
                        }
                    } catch {}
                    throw new Error(errorMsg);
                }
                const result = await response.json();
                const part = result?.candidates?.[0]?.content?.parts?.[0];
                const audioData = part?.inlineData?.data;
                const mimeType = part?.inlineData?.mimeType;
                if (!audioData || !mimeType || !mimeType.startsWith("audio/L16")) {
                    throw new Error('API response did not contain valid audio data.');
                }
                const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
                const pcmData = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmData);
                const wavBlob = pcmToWav(pcm16, sampleRate);
                audioUrl = URL.createObjectURL(wavBlob);
                audio = new Audio(audioUrl);
            }
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                toggleLoading(playButton, playTextSpan, loadingSpinner, false);
                showStatus('Playback finished!', 'success');
            };
            audio.play();
            showStatus('Playing audio...', 'info');
        } catch (e) {
            console.error(e);
            showStatus(`Error: ${e.message}`, 'error');
            toggleLoading(playButton, playTextSpan, loadingSpinner, false);
        }
    }

    async function generateText(prompt) {
        const currentText = ttsTextarea.value.trim();
        const apiKey = await getApiKey();
        const provider = localStorage.getItem(PROVIDER_KEY) || 'gemini';
        if (!apiKey) {
            showStatus('Please enter your API key first.', 'error');
            return;
        }
        toggleLoading(continueButton, continueButton.querySelector('span'), continueButton.querySelector('svg'), true);
        toggleLoading(summarizeButton, summarizeButton.querySelector('span'), summarizeButton.querySelector('svg'), true);
        showStatus('Generating text...', 'info');
        try {
            let response, generatedText;
            if (provider === 'openai') {
                const payload = {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: `${prompt}\n\n${currentText}` }]
                };
                response = await retryWithBackoff(() => fetch(OPENAI_LLM_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                }));
                if (!response.ok) {
                    let errorMsg = `OpenAI API call failed with status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        if (errorData?.error?.message) errorMsg = errorData.error.message;
                    } catch {}
                    throw new Error(errorMsg);
                }
                const result = await response.json();
                generatedText = result?.choices?.[0]?.message?.content;
            } else {
                const payload = {
                    contents: [{
                        parts: [{ text: `${prompt}\n\n${currentText}` }]
                    }]
                };
                response = await retryWithBackoff(() => fetch(`${GEMINI_LLM_API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }));
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || `API call failed with status: ${response.status}`);
                }
                const result = await response.json();
                generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            }
            if (!generatedText) {
                throw new Error('No text was generated by the API.');
            }
            ttsTextarea.value = generatedText.trim();
            showStatus('Text updated!', 'success');
        } catch (e) {
            console.error(e);
            showStatus(`Error: ${e.message}`, 'error');
        } finally {
            toggleLoading(continueButton, continueButton.querySelector('span'), continueButton.querySelector('svg'), false);
            toggleLoading(summarizeButton, summarizeButton.querySelector('span'), summarizeButton.querySelector('svg'), false);
        }
    }

    // --- Event Listeners and Initialization ---
    playButton.addEventListener('click', speakText);
    continueButton.addEventListener('click', () => generateText('Continue the following text:'));
    summarizeButton.addEventListener('click', () => generateText('Prepare a script from the following text, using clear speaker names like "Speaker1" and "Speaker2":'));
    populateVoices();
});
        } else {

