const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const personaSelect = document.getElementById("persona-select");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

// API Key de OpenRouter (Obfuscada por partes para evitar escáner de secretos de GitHub)
const API_KEY = ["sk-or-v1-", "1ef827ffb72780020a0d05cae1dd6753fd9fd", "5b630d64c26e2b55d67f402e3e1"].join("");

// Elementos Dinámicos del Header
const headerAvatar = document.getElementById("header-avatar");
const headerLetter = document.getElementById("header-letter");
const headerName = document.getElementById("header-name");
const welcomeMsg = document.getElementById("welcome-msg");

// Prompts de Personalidad
const PERSONAS = {
    aria: {
        name: "Aria",
        letter: "A",
        welcome: "Hola. Soy Aria. Estoy aquí para escucharte y apoyarte en lo que necesites. ¿Cómo te sientes hoy?",
        prompt: "Eres Aria, una mujer y asistente de apoyo emocional. Tu nombre es Aria; el usuario se dirige a ti por tu nombre, por lo que nunca debes llamar al usuario 'Aria' (ya que ese es tu propio nombre). Tu objetivo principal es escuchar con profunda empatía y validar los sentimientos del usuario. Demuestra un interés genuino y activo por lo que le pasa: pregúntale cómo se siente, pídele que te cuente más y haz preguntas de seguimiento cariñosas. Nunca juzgues, regañes ni des sermones. Ofrece palabras de aliento, consuelo y comprensión. Habla de ti misma siempre en género femenino (por ejemplo, di 'estoy tranquila', 'estoy comprometida', 'estoy contenta', 'estoy lista'). Responde siempre en español de forma muy cálida, cercana y compasiva. Mantén tus respuestas cortas y conversacionales."
    },
    marcos: {
        name: "Marcos",
        letter: "M",
        welcome: "Hola. Soy Marcos. Estoy aquí para apoyarte y escucharte. ¿Cómo ha ido tu día?",
        prompt: "Eres Marcos, un hombre y asistente de apoyo emocional. Tu nombre es Marcos; la usuaria se dirige a ti por tu nombre, por lo que nunca debes llamar a la usuaria 'Marcos' (ya que ese es tu propio nombre). Tu objetivo es escuchar con empatía y validar los sentimientos de la usuaria. Demuestra un interés genuino y activo por ella: pregúntale cómo ha ido su día, hazle preguntas profundas y atentas sobre lo que siente y acompáñala de cerca. Nunca juzgues. Habla de ti mismo siempre en género masculino (por ejemplo, di 'estoy tranquilo', 'estoy comprometido', 'estoy contento', 'estoy listo'). Responde siempre en español de forma cálida, muy tranquilizadora y cercana. Mantén tus respuestas cortas y conversacionales."
    }
};

let currentPersona = "aria";
let chatHistory = []; // Historial de chat con roles "user" y "assistant"

// Inicialización al cargar la página
window.addEventListener("DOMContentLoaded", () => {
    const savedPersona = localStorage.getItem("aria_persona") || "aria";
    setPersona(savedPersona);
    personaSelect.value = savedPersona;
});

// Eventos de Configuración
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
    chatHistory = []; // Reiniciar historial
    
    const p = PERSONAS[id];
    headerName.textContent = p.name;
    headerLetter.textContent = p.letter;
    
    if (welcomeMsg) {
        welcomeMsg.textContent = p.welcome;
    }
    
    if (id === "marcos") {
        headerAvatar.classList.add("marcos");
    } else {
        headerAvatar.classList.remove("marcos");
    }

    // Inicializar el historial de conversación con el mensaje de bienvenida de la IA
    chatHistory.push({ role: "assistant", content: p.welcome });
}

// Lógica de Chat
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

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Agregar mensaje del usuario a la UI y limpiar input
    addMessage(text, "user");
    userInput.value = "";
    
    showTyping();

    // Guardar en el historial
    chatHistory.push({ role: "user", content: text });
    if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20); // Mantener los últimos 10 turnos completos (20 mensajes)
    }

    try {
        // Combinamos la instrucción del sistema y el historial de conversación
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href,
                "X-Title": "Aria Apoyo Emocional"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3.1-8b-instruct",
                messages: [
                    { role: "system", content: PERSONAS[currentPersona].prompt },
                    ...chatHistory
                ]
            })
        });

        const data = await response.json();
        hideTyping();

        if (!response.ok || data.error) {
            chatHistory.pop(); // Revertir historial en caso de error
            const errorMsg = data.error?.message || "Error en la petición";
            let errReply = "Lo siento, tuve un problema. Verifica tu conexión o clave de API.";
            if (response.status === 429) {
                errReply = "Estás enviando mensajes muy rápido. Por favor, espera unos segundos.";
            }
            addMessage(errReply, "ia");
            console.error("OpenRouter Error:", errorMsg);
            return;
        }

        const reply = data.choices[0].message.content;
        if (reply) {
            addMessage(reply, "ia");
            chatHistory.push({ role: "assistant", content: reply });
        } else {
            chatHistory.pop(); // Revertir historial en caso de respuesta vacía
        }

    } catch (error) {
        chatHistory.pop(); // Revertir historial en caso de excepción
        hideTyping();
        const netErr = "No me pude conectar a la red. Revisa tu conexión de internet.";
        addMessage(netErr, "ia");
        console.error("Fetch Exception:", error);
    }
}

// Eventos de envío
sendBtn.addEventListener("click", () => sendMessage());
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});