const GEMINI_API_KEY = "AIzaSyAcxpsg_2vOXDffHsjuJ5TVyszZWhTztZM;
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const chatbotPopup = document.querySelector('.chatbot-popup');
const chatHeader = document.querySelector('.chat-header');
const closeBtn = document.querySelector('.close-btn');
const chatBody = document.querySelector('.chat-body');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');

const voiceInputBtn = document.getElementById('voice-input-btn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

let imageBase64Data = null;
let imageMimeType = null;
let isVoiceSubmission = false;

// ================= UI =================
const createMessageElement = (message, type) => {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('messages', `${type}-message`);
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    textDiv.textContent = message;
    messageWrapper.appendChild(textDiv);
    return messageWrapper;
};

const scrollToBottom = () => {
    chatBody.scrollTop = chatBody.scrollHeight;
};

// ================= GEMINI TEXT =================
const getGeminiResponse = async (userMessage) => {
    try {
        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userMessage }]
                    }
                ]
            }),
        });

        console.log("STATUS:", response.status);

        const data = await response.json();
        console.log("DATA:", data);

        return data.candidates?.[0]?.content?.parts?.[0]?.text 
            || "Maaf, AI tidak bisa jawab.";
    } catch (error) {
        console.error("Fetch Error:", error);
        return "Terjadi masalah koneksi.";
    }
};

// ================= GEMINI IMAGE =================
const getGeminiVisionResponse = async (userMessage, base64Image, mimeType) => {
    try {
        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: userMessage || "Jelaskan gambar ini" },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ]
            }),
        });

        const data = await response.json();

        return data.candidates?.[0]?.content?.parts?.[0]?.text 
            || "Gambar tidak bisa diproses.";
    } catch (error) {
        console.error("Vision Error:", error);
        return "Terjadi masalah koneksi Vision.";
    }
};

// ================= VOICE =================
const speakBotResponse = (text) => {
    if (synth.speaking) synth.cancel();

    if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        synth.speak(utterance);
    }
};

if (SpeechRecognition && voiceInputBtn) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';

    recognition.onresult = (event) => {
        messageInput.value = event.results[0][0].transcript;
    };

    voiceInputBtn.addEventListener('click', () => {
        recognition.start();
        isVoiceSubmission = true;
    });
}

// ================= CHAT =================
const handleChat = async (e) => {
    e.preventDefault();

    const userMessage = messageInput.value.trim();
    if (!userMessage && !imageBase64Data) return;

    chatBody.appendChild(createMessageElement(userMessage || "Mengirim gambar...", 'user'));
    scrollToBottom();

    messageInput.value = "";
    messageInput.disabled = true;

    const typing = createMessageElement("Mengetik...", 'bot');
    chatBody.appendChild(typing);

    let botResponse;

    if (imageBase64Data) {
        botResponse = await getGeminiVisionResponse(userMessage, imageBase64Data, imageMimeType);
    } else {
        botResponse = await getGeminiResponse(userMessage);
    }

    typing.remove();
    chatBody.appendChild(createMessageElement(botResponse, 'bot'));
    scrollToBottom();

    if (isVoiceSubmission) speakBotResponse(botResponse);
    isVoiceSubmission = false;

    messageInput.disabled = false;
};

// ================= IMAGE =================
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const dataUrl = event.target.result;
        imageBase64Data = dataUrl.split(',')[1];
        imageMimeType = file.type;
    };

    reader.readAsDataURL(file);
});

// ================= EVENT =================
chatForm.addEventListener('submit', handleChat);

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
    chatBody.appendChild(
        createMessageElement("Halo! Saya Ama Chatbot. Tanyakan apapun akan saya jawab!", 'bot')
    );
});
