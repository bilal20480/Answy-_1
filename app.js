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

// ================== ENFORCE LOGIN (global) ==================
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  const isChat = !!document.getElementById("chat-container");

  // If user not logged in and on chat page -> redirect to index
  if (!user && isChat) {
    window.location.href = "index.html";
    return;
  }

  // If user not logged in on index -> show gate overlay and lock page
  const loginGate = document.getElementById("login-gate");
  if (!user && loginGate) {
    loginGate.style.display = "flex";
    // NEW: hide the whole app behind a blank screen until login
    document.body.classList.add("locked");
  }

  // If logged in -> render user information, hide gate, unlock page
  if (user) {
    renderUserInNavbar(user);
    if (loginGate) loginGate.style.display = "none";
    document.body.classList.remove("locked");

    // Auto-fill feedback fields if present
    const nameInput = document.querySelector("#feedback input[type='text']");
    const emailInput = document.querySelector("#feedback input[type='email']");
    if (nameInput && emailInput) {
      nameInput.value = user.name || "";
      emailInput.value = user.email || "";
    }
  }
});

// Helpers for user state
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}
function setUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
  if (user?.email) localStorage.setItem("userEmail", user.email);
}
function clearUser() {
  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");
  // Prevent silent auto-login & show account chooser next time
  if (window.google?.accounts?.id?.disableAutoSelect) {
    google.accounts.id.disableAutoSelect();
  }
}

// Render user info + signout in navbar
function renderUserInNavbar(user) {
  const slot = document.getElementById("user-slot");
  if (!slot) return;
  if (!document.querySelector(".user-info")) {
    const wrap = document.createElement("div");
    wrap.className = "user-info";
    wrap.innerHTML = `
      <img src="${user.picture}" alt="User" class="user-avatar">
      <span>${user.name || user.email || "User"}</span>
      <button class="signout-btn" id="signout-btn" title="Sign out / switch account">Sign out</button>
    `;
    slot.innerHTML = "";
    slot.appendChild(wrap);
    const btn = document.getElementById("signout-btn");
    btn.addEventListener("click", () => {
      clearUser();
      // Reload to force login gate & account chooser
      window.location.reload();
    });
  }
}

// ================== GOOGLE LOGIN HANDLERS ==================
function handleGoogleLogin(response) {
  const userInfo = parseJwt(response.credential);
  console.log("✅ Google User:", userInfo);

  // Persist user + email
  setUser({
    sub: userInfo.sub,
    name: userInfo.name,
    email: userInfo.email,
    picture: userInfo.picture
  });

  // Update navbar and hide gate if present
  renderUserInNavbar(getUser());
  const loginGate = document.getElementById("login-gate");
  if (loginGate) loginGate.style.display = "none";
  // NEW: reveal the app when logged in
  document.body.classList.remove("locked");

  // Autofill feedback if present
  const nameInput = document.querySelector("#feedback input[type='text']");
  const emailInput = document.querySelector("#feedback input[type='email']");
  if (nameInput && emailInput) {
    nameInput.value = userInfo.name || "";
    emailInput.value = userInfo.email || "";
  }
}

function parseJwt(token) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

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
  document.querySelector(".feedback form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("✅ Thank you for your feedback!");
    e.target.reset();
  });
}
