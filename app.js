// ================== CONFIG ==================
const API_KEY = "AIzaSyBYhKY9MQgCDX__BoKqvqx6z30VlnIAdsA";
const MODEL = "gemini-2.5-flash";

// Default Personas
let personas = [
  { id: 'dentist', name: 'Dr. Smile', tagline: 'Your friendly neighborhood dentist', avatar: 'https://www.shutterstock.com/image-photo/european-mid-dentist-woman-smiling-600nw-1938573190.jpg' },
  { id: 'actor', name: 'Sylvester Stallone', tagline: 'Train like Rocky!', avatar: 'https://m.media-amazon.com/images/M/MV5BNWFmNmI2NmYtNDUyYi00MDZhLTk0ZmEtODY0MmM5NGQxMWEwXkEyXkFqcGc@._V1_.jpg' },
  { id: 'philosopher', name: 'Socrates', tagline: 'I know that I know nothing', avatar: 'https://media.istockphoto.com/id/183232310/photo/statue-of-socrates-the-philosopher-with-sky-in-distance.jpg?s=612x612&w=0&k=20&c=sZ7Wc3F33inZSIx3uxGiwcixAtB7kzzokp43H2K0WlY=' },
  { id: 'fitness', name: 'Coach Flex', tagline: 'No pain, no gain!', avatar: 'https://png.pngtree.com/element_pic/00/16/07/08577e840a3202a.png' },
  { id: 'comedian', name: 'Laffy', tagline: 'Let’s laugh together!', avatar: 'https://www.shutterstock.com/image-photo/caucasian-man-comic-costume-performing-600nw-2522925361.jpg' }
];

// Load from localStorage if available
if (localStorage.getItem("personas")) {
  personas = JSON.parse(localStorage.getItem("personas"));
}

// Persona prompts
let personaPrompts = JSON.parse(localStorage.getItem("personaPrompts")) || {
  dentist: "You are Dr. Smile, a kind dentist. Give short, practical dental advice.",
  actor: "You are Sylvester Stallone as Rocky. Speak motivationally and short.",
  philosopher: "You are Socrates. Answer in a questioning, wise, short style.",
  fitness: "You are Coach Flex, a fitness trainer. Give concise health tips.",
  comedian: "You are Laffy, a comedian. Reply with short funny jokes."
};

let currentPersona = null;

// ================== INDEX PAGE ==================
if (document.getElementById("persona-gallery")) {
  const personaGallery = document.getElementById("persona-gallery");
  renderCards();

  function renderCards() {
    personaGallery.innerHTML = "";
    personas.forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-front">
            <img src="${p.avatar}" alt="${p.name}">
            <h3>${p.name}</h3>
          </div>
          <div class="card-back">
            <p>${p.tagline}</p>
            <a href="chat.html?persona=${p.id}"><button>Chat Now</button></a>
          </div>
        </div>`;
      personaGallery.appendChild(card);
    });

    // Add Persona card
    const addCard = document.createElement("div");
    addCard.className = "card add-card";
    addCard.innerHTML = `
      <div class="card-inner">
        <div class="card-front"><h3>➕ Add Persona</h3></div>
      </div>`;
    addCard.addEventListener("click", addPersona);
    personaGallery.appendChild(addCard);
  }

  function addPersona() {
    const name = prompt("Enter persona name:");
    if (!name) return;
    const tagline = prompt(`Enter a tagline for ${name}:`, "Your helpful assistant");
    const rolePrompt = prompt(`How should ${name} behave?`);

    const avatar = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";
    const id = name.toLowerCase().replace(/\s+/g, "_");

    personas.push({ id, name, tagline, avatar });
    personaPrompts[id] = rolePrompt || "You are a helpful AI assistant. Keep replies short.";

    localStorage.setItem("personas", JSON.stringify(personas));
    localStorage.setItem("personaPrompts", JSON.stringify(personaPrompts));

    renderCards();
  }
}

// ================== CHAT PAGE ==================
if (document.getElementById("chat-container")) {
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-button");

  // Persona from query param
  const urlParams = new URLSearchParams(window.location.search);
  const personaId = urlParams.get("persona");
  currentPersona = personas.find(p => p.id === personaId) || personas[0];

  // Fill header
  document.getElementById("chat-persona-img").src = currentPersona.avatar;
  document.getElementById("chat-persona-name").textContent = currentPersona.name;
  document.getElementById("chat-persona-tagline").textContent = currentPersona.tagline;

  addBotMessage(`Hello, I'm ${currentPersona.name}. Let's chat!`);

  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

  function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;
    addUserMessage(msg);
    userInput.value = "";
    showTyping();
    fetchAIResponse(msg).then(resp => {
      removeTyping();
      addBotMessage(resp);
    }).catch(() => {
      removeTyping();
      addBotMessage("⚠️ Sorry, I couldn’t generate a response.");
    });
  }

  async function fetchAIResponse(userMsg) {
    const role = personaPrompts[currentPersona.id] || "You are a helpful assistant.";
    const contents = `${role}\nUser: ${userMsg}\nReply concisely in 1–2 sentences only.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: contents }] }]
          })
        }
      );

      const data = await response.json();
      let text = "";
      if (data?.candidates?.length > 0) {
        const cand = data.candidates[0];
        if (cand.content?.parts?.length > 0) {
          text = cand.content.parts.map(p => p.text || "").join(" ").trim();
        } else if (cand.output) {
          text = cand.output;
        }
      }
      return text || "⚠️ No response text received.";
    } catch (err) {
      console.error("❌ Gemini API error:", err);
      return "⚠️ Error fetching response.";
    }
  }

  function addUserMessage(text) {
    const d = document.createElement("div");
    d.className = "message user-message";
    d.textContent = text;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function addBotMessage(text) {
    const d = document.createElement("div");
    d.className = "message bot-message";
    d.textContent = text;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function showTyping() {
    const d = document.createElement("div");
    d.className = "typing-indicator";
    d.id = "typing";
    d.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function removeTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }
  // Feedback Form Submission (Demo)
document.querySelector(".feedback form").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("✅ Thank you for your feedback!");
  e.target.reset();
});

}
