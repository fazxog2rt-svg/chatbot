const GEMINI_API_KEY = "AIzaSyC8kePXQO5mTl4W7RKtIxwMQAhhwiUC7bk";
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ================= UI =================
const chatbotPopup = document.querySelector('.chatbot-popup');
const chatBody = document.querySelector('.chat-body');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const imageUpload = document.getElementById('image-upload');

let imageBase64Data = null;
let imageMimeType = null;

// ================= UI FUNCTION =================
const createMessageElement = (message, type) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('messages', `${type}-message`);

    const text = document.createElement('div');
    text.classList.add('message-text');
    text.textContent = message;

    wrapper.appendChild(text);
    return wrapper;
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
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            }),
        });

        const data = await response.json();
        console.log("FULL RESPONSE:", data);

        if (data.error) return data.error.message;

        return data.candidates?.[0]?.content?.parts
            ?.map(p => p.text || "")
            .join("")
            || "AI tidak mengembalikan respon.";

    } catch (error) {
        console.error(error);
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
                ],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 4096
                }
            }),
        });

        const data = await response.json();

        if (data.error) return data.error.message;

        return data.candidates?.[0]?.content?.parts
            ?.map(p => p.text || "")
            .join("")
            || "Gambar tidak bisa diproses.";

    } catch (error) {
        console.error(error);
        return "Terjadi masalah koneksi Vision.";
    }
};

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
        imageBase64Data = null;
    } else {
        botResponse = await getGeminiResponse(userMessage);
    }

    typing.remove();
    chatBody.appendChild(createMessageElement(botResponse, 'bot'));
    scrollToBottom();

    messageInput.disabled = false;
    messageInput.focus();
};

// ================= IMAGE =================
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        const dataUrl = event.target.result;
        imageBase64Data = dataUrl.split(',')[1];
        imageMimeType = file.type;
    };

    reader.readAsDataURL(file);
});

// ================= INIT =================
chatForm.addEventListener('submit', handleChat);

document.addEventListener('DOMContentLoaded', () => {
    if (chatBody) {
        chatBody.appendChild(
            createMessageElement("Halo! Saya Ama Chatbot. Tanyakan apapun akan saya jawab!", 'bot')
        );
    }
});
