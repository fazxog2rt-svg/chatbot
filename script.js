const GEMINI_API_KEY = "AIzaSyA-ADQf8G35T3L6FTv9i6JIPFmquJ58qbY"; 
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
let isVoiceSubmission = false; // <<< VARIABEL BARU UNTUK MENGONTROL SUARA BOT

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

function displayImagePreview(dataUrl, mimeType) {
    imagePreviewContainer.innerHTML = '';
    
    imageMimeType = mimeType; 
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = "Pratinjau Gambar";
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'x';
    removeBtn.onclick = clearImagePreview;

    imagePreviewContainer.appendChild(img);
    imagePreviewContainer.appendChild(removeBtn);

    messageInput.placeholder = "Gambar terlampir. Tulis pertanyaan Anda...";
}

function clearImagePreview() {
    imagePreviewContainer.innerHTML = '';
    imageBase64Data = null;
    imageMimeType = null;
    imageUpload.value = ''; 
    messageInput.placeholder = "Ketik pesan Anda atau tanyakan tentang gambar...";
    messageInput.focus();
}

const getGeminiResponse = async (userMessage) => {
    try {
        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: userMessage }] }],
            }),
        });
        const data = await response.json();
        return data.candidates && data.candidates.length > 0 
               ? data.candidates[0].content.parts[0].text 
               : "Maaf, AI tidak dapat memberikan respons.";

    } catch (error) {
        console.error("Fetch Error:", error);
        return "Terjadi masalah koneksi.";
    }
};

const getGeminiVisionResponse = async (userMessage, base64Image, mimeType) => {
    const contents = [
        { role: "user", 
          parts: [
            { text: userMessage || "Deskripsikan atau analisis gambar ini." }, 
            { inlineData: { 
                mimeType: mimeType,
                data: base64Image 
              } 
            }
          ] 
        }
    ];

    try {
        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gemini-2.5-flash", 
                contents: contents,
            }),
        });

        const data = await response.json();
        if (data.error) {
            return `Maaf, Vision AI error: ${data.error.message}`;
        }
        return data.candidates && data.candidates.length > 0 
               ? data.candidates[0].content.parts[0].text 
               : "Maaf, AI tidak dapat memproses gambar ini.";
    
    } catch (error) {
        console.error("Vision Fetch Error:", error);
        return "Terjadi masalah koneksi Vision AI.";
    }
};

const speakBotResponse = (text) => {
    if (synth.speaking) {
        synth.cancel();
    }
    
    if (text !== '') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID'; 

        const voices = synth.getVoices();
        const indonesianVoice = voices.find(voice => voice.lang === 'id-ID');
        if (indonesianVoice) {
            utterance.voice = indonesianVoice;
        }

        synth.speak(utterance);
    }
};

if (SpeechRecognition && voiceInputBtn) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript; 
    };

    recognition.onend = () => {
        voiceInputBtn.style.color = '#5b3092'; 
        messageInput.placeholder = "Ketik pesan Anda...";
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        voiceInputBtn.style.color = 'red';
        messageInput.placeholder = "Gagal merekam. Coba lagi.";
    };

    voiceInputBtn.addEventListener('click', () => {
        try {
            recognition.start();
            voiceInputBtn.style.color = 'red'; 
            messageInput.placeholder = "Mendengarkan...";
            isVoiceSubmission = true; // <<< SETEL FLAG VOICE
        } catch (e) {
            console.error('Recognition already started or error:', e);
        }
    });
}

const handleChat = async (e) => {
    e.preventDefault(); 
    
    const userMessage = messageInput.value.trim();
    
    if (!userMessage && !imageBase64Data) return; 

    let userDisplayMessage = userMessage || "Mengirim Gambar...";
    
    const messageWrapper = createMessageElement(userDisplayMessage, 'user');
    
    if (imageBase64Data) {
        const img = document.createElement('img');
        img.src = imagePreviewContainer.querySelector('img').src;
        img.classList.add('message-image');
        
        const messageTextElement = messageWrapper.querySelector('.message-text');
        messageTextElement.textContent = userDisplayMessage; 
        messageTextElement.appendChild(document.createElement('br'));
        messageTextElement.appendChild(img);
    }
    chatBody.appendChild(messageWrapper);
    scrollToBottom();

    messageInput.value = "";
    messageInput.disabled = true;
    
    const typingIndicator = createMessageElement("Mengetik...", 'bot');
    typingIndicator.classList.add('typing-indicator'); 
    chatBody.appendChild(typingIndicator);
    scrollToBottom();

    let botResponse;

    if (imageBase64Data) {
        botResponse = await getGeminiVisionResponse(userMessage, imageBase64Data, imageMimeType);
        clearImagePreview(); 
    } else {
        botResponse = await getGeminiResponse(userMessage); 
    }

    typingIndicator.remove(); 
    chatBody.appendChild(createMessageElement(botResponse, 'bot'));
    scrollToBottom();
    
    // <<< LOGIKA KONTROL SUARA BOT >>>
    if (isVoiceSubmission) { 
        speakBotResponse(botResponse); 
    }
    isVoiceSubmission = false; // <<< RESET FLAG SETELAH RESPON

    messageInput.disabled = false;
    messageInput.focus();
};

imageUpload.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = function(event) {
            const dataUrl = event.target.result;
            const mimeType = file.type;
            
            imageBase64Data = dataUrl.split(',')[1]; 
            
            displayImagePreview(dataUrl, mimeType);
        };
        
        reader.readAsDataURL(file);
    }
});

const toggleChatbot = () => {
    chatbotPopup.classList.toggle('minimized');
    if (chatbotPopup.classList.contains('minimized')) {
        closeBtn.textContent = 'arrow_upward';
    } else {
        closeBtn.textContent = 'arrow_downward';
        scrollToBottom();
    }
};

chatForm.addEventListener('submit', handleChat);
closeBtn.addEventListener('click', toggleChatbot);
chatHeader.addEventListener('click', (e) => {
    if (!e.target.closest('.close-btn')) {
        toggleChatbot();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (chatBody) {
        chatBody.appendChild(createMessageElement("Halo! Saya Ama Chatbot. Tanyakan apapun akan saya jawab!", 'bot'));
        scrollToBottom();
    }
});

if (chatbotPopup) {
    chatbotPopup.classList.remove('minimized'); 
}
if (closeBtn) {
    closeBtn.textContent = 'arrow_downward';

}
