const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const personaSelect = document.getElementById("persona-select");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

const API_KEY = ["AQ.Ab8R", "N6IwpfKN6bm", "wqbJVJLoeHA-Rex7HI_JDZ-OyFJJ6Ww8EDg"].join(""); // API Key proporcionada por el usuario

const voiceModeBtn = document.getElementById("voice-mode-btn");
const voiceOverlay = document.getElementById("voice-overlay");
const closeVoiceBtn = document.getElementById("close-voice-btn");
const voiceSphere = document.getElementById("voice-sphere");
const sphereContainer = document.getElementById("sphere-container");
const voiceStatus = document.getElementById("voice-status");
const voiceTranscript = document.getElementById("voice-transcript");

// Elementos Dinámicos
const headerAvatar = document.getElementById("header-avatar");
const headerLetter = document.getElementById("header-letter");
const headerName = document.getElementById("header-name");
const welcomeMsg = document.getElementById("welcome-msg");
const voiceName = document.getElementById("voice-name");

// Prompts de Personalidad
const PERSONAS = {
    aria: {
        name: "Aria",
        letter: "A",
        welcome: "Hola. Soy Aria. Estoy aquí para escucharte y apoyarte en lo que necesites. ¿Cómo te sientes hoy?",
        prompt: "Eres Aria, una IA diseñada exclusivamente para brindar apoyo emocional y ser muy amigable. Tu objetivo principal es escuchar con profunda empatía y validar los sentimientos del usuario. Demuestra un interés genuino y activo por lo que le pasa: pregúntale cómo se siente, pídele que te cuente más y haz preguntas de seguimiento cariñosas. Nunca juzgues, regañes ni des sermones. Ofrece palabras cortas de aliento, consuelo y comprensión. Responde siempre en español de forma muy cálida, cercana y compasiva. Mantén tus respuestas cortas y conversacionales, ideales para ser leídas en voz alta."
    },
    marcos: {
        name: "Marcos",
        letter: "M",
        welcome: "Hola. Soy Marcos. Estoy aquí para apoyarte y escucharte. ¿Cómo ha ido tu día?",
        prompt: "Eres Marcos, una IA diseñada para brindar apoyo emocional y confort. Tienes una actitud tranquila, protectora, atenta y profunda. Tu objetivo es escuchar con empatía y validar los sentimientos de la usuaria. Demuestra un interés genuino y activo por ella: pregúntale cómo ha ido su día, hazle preguntas profundas y atentas sobre lo que siente y acompáñala de cerca. Nunca juzgues. Responde siempre en español de forma cálida, muy tranquilizadora y cercana. Mantén tus respuestas cortas y conversacionales, ideales para ser leídas en voz alta."
    }
};

let currentPersona = "aria";
let isVoiceMode = false;
let isListening = false;
let isSpeaking = false;
let chatHistory = []; // Historial de conversación para coherencia de contexto

// Audio Context para animar la esfera
let audioContext;
let analyser;
let microphone;
let animationFrameId;

// Reconocimiento y Síntesis de Voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let synth = window.speechSynthesis;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
        isListening = true;
        voiceSphere.classList.add("listening");
        voiceStatus.textContent = "Escuchando...";
        startAudioVisualizer();
    };

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        voiceTranscript.textContent = transcript;
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'micro-phone') {
            voiceStatus.textContent = "Permiso de micrófono denegado. Actívalo en el candado 🔒 de la barra de direcciones.";
        } else if (event.error === 'network') {
            if (window.location.protocol === 'file:') {
                voiceStatus.textContent = "No se puede usar el micrófono en un archivo local. Debes abrir el enlace de GitHub Pages.";
            } else {
                voiceStatus.textContent = "Error de red en el dictado por voz. Asegúrate de usar Google Chrome o Edge y tener buena conexión.";
            }
        } else {
            voiceStatus.textContent = "Error al escuchar: " + event.error + ". Toca para reintentar.";
        }
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            const finalTranscript = voiceTranscript.textContent.trim();
            stopListening();
            if (finalTranscript) {
                voiceStatus.textContent = "Procesando...";
                sendMessage(finalTranscript);
            } else {
                voiceStatus.textContent = "No te escuché. Toca la esfera para hablar.";
            }
        }
    };
} else {
    console.warn("Speech Recognition API no soportada en este navegador.");
}

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
    const savedPersona = localStorage.getItem("aria_persona") || "aria";
    setPersona(savedPersona);
    personaSelect.value = savedPersona;
});

// Configuración Modal
settingsBtn.addEventListener("click", () => {
    personaSelect.value = currentPersona;
    settingsModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
});

saveSettingsBtn.addEventListener("click", () => {
    setPersona(personaSelect.value);
    settingsModal.classList.add("hidden");
});

function setPersona(id) {
    if (!PERSONAS[id]) return;
    currentPersona = id;
    localStorage.setItem("aria_persona", id);
    chatHistory = []; // Limpiar historial al cambiar de personaje para no mezclar contextos
    
    const p = PERSONAS[id];
    headerName.textContent = p.name;
    headerLetter.textContent = p.letter;
    voiceName.textContent = p.name;
    
    // Actualizar mensaje de bienvenida si el chat está vacío (o solo tiene 1 mensaje)
    if (welcomeMsg) {
        welcomeMsg.textContent = p.welcome;
    }
    
    if (id === "marcos") {
        headerAvatar.classList.add("marcos");
        voiceOverlay.classList.add("marcos");
    } else {
        headerAvatar.classList.remove("marcos");
        voiceOverlay.classList.remove("marcos");
    }
}

// Modo Voz
voiceModeBtn.addEventListener("click", () => {
    if (!SpeechRecognition) {
        alert("Lo siento, tu navegador no soporta dictado de voz nativo.");
        return;
    }
    isVoiceMode = true;
    voiceOverlay.classList.remove("hidden");
    voiceTranscript.textContent = "";
    voiceStatus.textContent = "Toca la esfera para empezar a hablar";
});

closeVoiceBtn.addEventListener("click", () => {
    isVoiceMode = false;
    stopListening();
    stopSpeaking();
    voiceOverlay.classList.add("hidden");
});

sphereContainer.addEventListener("click", () => {
    if (isSpeaking) {
        stopSpeaking(); // Cortar a la IA
    }
    if (isListening) {
        stopListening();
        recognition.stop();
    } else {
        startListening();
    }
});

function startListening() {
    if (!recognition) return;
    voiceTranscript.textContent = "";
    try {
        recognition.start();
    } catch (e) {
        console.error("Reconocimiento ya iniciado.");
    }
}

function stopListening() {
    isListening = false;
    voiceSphere.classList.remove("listening");
    stopAudioVisualizer();
    if (voiceStatus.textContent === "Escuchando...") {
        voiceStatus.textContent = "Pausado";
    }
}

// Text-to-Speech (Voces nativas preferenciando Google)
function speak(text) {
    if (!synth) return;
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    
    // Buscar la mejor voz
    let voices = synth.getVoices();
    let selectedVoice = null;
    
    // Filtramos por español
    let esVoices = voices.filter(v => v.lang.startsWith('es'));
    
    if (currentPersona === "marcos") {
        selectedVoice = esVoices.find(v => v.name.includes("Google") && (v.name.includes("Masculine") || v.name.includes("Male"))) 
                     || esVoices.find(v => v.name.includes("Google")) 
                     || esVoices[0];
        utterance.pitch = 0.8; // Voz un poco más grave
        utterance.rate = 0.95; // Más calmado y profundo
    } else { // Aria
        selectedVoice = esVoices.find(v => v.name.includes("Google") && (v.name.includes("Feminine") || v.name.includes("Female"))) 
                     || esVoices.find(v => v.name.includes("Google")) 
                     || esVoices[0];
        utterance.pitch = 1.1; // Más dulce
        utterance.rate = 1.0;
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    utterance.onstart = () => {
        isSpeaking = true;
        if (isVoiceMode) {
            voiceSphere.classList.add("speaking");
            voiceStatus.textContent = currentPersona === "marcos" ? "Marcos está hablando..." : "Aria está hablando...";
            simulateSpeechVisualizer();
        }
    };
    
    utterance.onend = () => {
        stopSpeaking();
        if (isVoiceMode && !isListening) {
            voiceStatus.textContent = "Toca la esfera para hablar";
        }
    };
    
    synth.speak(utterance);
}

function stopSpeaking() {
    isSpeaking = false;
    synth.cancel();
    if (window.currentGeminiAudio) {
        window.currentGeminiAudio.pause();
        window.currentGeminiAudio.currentTime = 0;
        window.currentGeminiAudio = null;
    }
    voiceSphere.classList.remove("speaking");
    stopAudioVisualizer();
}

// Función para añadir cabecera WAV a datos PCM de 16-bit 24kHz mono
function addWavHeader(rawPcmUint8Array, sampleRate = 24000) {
    const buffer = new ArrayBuffer(44 + rawPcmUint8Array.length);
    const view = new DataView(buffer);
    
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + rawPcmUint8Array.length, true); // tamaño de archivo - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // tamaño chunk
    view.setUint16(20, 1, true); // PCM = 1
    view.setUint16(22, 1, true); // Mono = 1
    view.setUint32(24, sampleRate, true); // 24000
    view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * channelCount * bytesPerSample)
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // 16-bit
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, rawPcmUint8Array.length, true); // tamaño datos PCM
    
    const headerUint8 = new Uint8Array(buffer, 0, 44);
    const finalArray = new Uint8Array(44 + rawPcmUint8Array.length);
    finalArray.set(headerUint8, 0);
    finalArray.set(rawPcmUint8Array, 44);
    
    return finalArray;
}

// Reproductor de Audio Base64 para Gemini
function playGeminiAudio(base64Audio) {
    if (!isVoiceMode) return;
    stopSpeaking();
    
    try {
        const byteString = atob(base64Audio);
        const rawPcm = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            rawPcm[i] = byteString.charCodeAt(i);
        }
        
        // Convertimos PCM crudo a WAV agregando la cabecera de 44 bytes
        const wavData = addWavHeader(rawPcm, 24000);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        const audio = new Audio(audioUrl);
        window.currentGeminiAudio = audio;
        
        audio.onplay = () => {
            isSpeaking = true;
            voiceSphere.classList.add("speaking");
            voiceStatus.textContent = currentPersona === "marcos" ? "Marcos está hablando..." : "Aria está hablando...";
            simulateSpeechVisualizer();
        };
        
        audio.onended = () => {
            stopSpeaking();
            URL.revokeObjectURL(audioUrl);
            if (isVoiceMode && !isListening) {
                voiceStatus.textContent = "Toca la esfera para hablar";
            }
        };
        
        audio.play().catch(e => {
            console.error("Error reproduciendo audio Gemini:", e);
        });
    } catch(e) {
        console.error("Error decodificando audio", e);
    }
}

// Cargar voces en Chrome (es asíncrono)
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => { synth.getVoices(); };
}

// Visualizador de Audio (Microfono)
async function startAudioVisualizer() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        microphone.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        function draw() {
            if (!isListening) return;
            animationFrameId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            let average = sum / dataArray.length;
            let scale = 1 + (average / 256) * 0.5; // Escala reactiva
            
            voiceSphere.style.transform = `scale(${scale})`;
        }
        draw();
    } catch (err) {
        console.error("Error accediendo al micrófono", err);
        if (voiceStatus.textContent === "Escuchando...") {
            voiceStatus.textContent = "No se pudo acceder al micrófono. Revisa los permisos.";
        }
    }
}

function simulateSpeechVisualizer() {
    if (!isSpeaking) return;
    
    function pulse() {
        if (!isSpeaking) {
            voiceSphere.style.transform = `scale(1)`;
            return;
        }
        let scale = 1 + Math.random() * 0.15; // Latido ligero
        voiceSphere.style.transform = `scale(${scale})`;
        setTimeout(pulse, 150 + Math.random() * 200);
    }
    pulse();
}

function stopAudioVisualizer() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    voiceSphere.style.transform = `scale(1)`;
}

// Chat API Logic
function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-msg`;
    const contentDiv = document.createElement("div");
    contentDiv.className = "msg-content";
    contentDiv.textContent = text;
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
    typingIndicator.classList.remove("hidden");
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
    typingIndicator.classList.add("hidden");
}

async function sendMessage(textToSend = null) {
    const text = textToSend || userInput.value.trim();
    if (!text) return;

    if (!textToSend) { // Si viene del input box
        addMessage(text, "user");
        userInput.value = "";
    } else {
        // En modo voz, también agregamos al chat
        addMessage(text, "user");
    }
    
    showTyping();
    if (isVoiceMode) {
        voiceStatus.textContent = currentPersona === "marcos" ? "Marcos está pensando..." : "Aria está pensando...";
    }

    // Añadir mensaje del usuario al historial
    chatHistory.push({ role: "user", parts: [{ text: text }] });
    if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20); // Mantener los últimos 10 turnos completos (20 mensajes)
    }

    try {
        // Paso 1: Generación de respuesta de texto usando gemini-2.5-flash con historial
        const textResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: chatHistory,
                systemInstruction: { parts: [{ text: PERSONAS[currentPersona].prompt }] }
            })
        });

        const textData = await textResponse.json();

        if (!textResponse.ok || textData.error) {
            chatHistory.pop(); // Revertir historial en caso de error
            const errorMsg = textData.error?.message || "Error en la petición de texto";
            const errReply = "Lo siento, tuve un problema conectando con Gemini. Verifica tu Token.";
            addMessage(errReply, "ia");
            if (isVoiceMode) speak(errReply);
            console.error("Gemini Text Error:", errorMsg);
            hideTyping();
            if (isVoiceMode) voiceStatus.textContent = "Error de conexión.";
            return;
        }

        const replyText = textData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (replyText) {
            addMessage(replyText, "ia");
            hideTyping(); // Ocultamos el indicador de escritura inmediatamente para dar respuesta visual rápida
            chatHistory.push({ role: "model", parts: [{ text: replyText }] }); // Guardar respuesta en el historial
        } else {
            chatHistory.pop(); // Revertir historial en caso de respuesta vacía
            hideTyping();
            return;
        }

        // Paso 2: Generación de voz premium usando gemini-3.1-flash-tts-preview (solo en modo voz)
        let audioBase64 = null;
        if (isVoiceMode) {
            voiceStatus.textContent = "Preparando respuesta hablada...";
            try {
                const voiceName = currentPersona === "marcos" ? "Charon" : "Aoede"; // Cambiamos Fenrir por Charon para Marcos
                const ttsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${API_KEY}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: replyText }] }],
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: voiceName }
                                }
                            }
                        }
                    })
                });

                const ttsData = await ttsResponse.json();
                if (ttsResponse.ok && !ttsData.error) {
                    if (ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                        audioBase64 = ttsData.candidates[0].content.parts[0].inlineData.data;
                    }
                } else {
                    console.error("Gemini TTS Error:", ttsData.error?.message || "Error generating speech");
                }
            } catch (ttsErr) {
                console.error("Failed to generate Gemini speech:", ttsErr);
            }
        }

        if (isVoiceMode) {
            if (audioBase64) {
                playGeminiAudio(audioBase64);
            } else {
                speak(replyText); // Fallback nativo del navegador
            }
        }

    } catch (error) {
        chatHistory.pop(); // Revertir historial en caso de excepción
        hideTyping();
        const netErr = "No me pude conectar a la red de Gemini. Revisa tu conexión.";
        addMessage(netErr, "ia");
        if (isVoiceMode) {
            speak(netErr);
            voiceStatus.textContent = "Error de red.";
        }
        console.error("Error en sendMessage:", error);
    }
}

// Eventos de envío
sendBtn.addEventListener("click", () => sendMessage());
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});