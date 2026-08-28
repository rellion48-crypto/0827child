/* ==========================================================================
   BEST TAXI - Simple Place to Taxi Reservation Logic
   - Two-Block Workflow: Place Block ➔ Taxi Block ➔ Confirmation
   - Auto Carry-over of Destination
   - Seamless Slot Modification
   - Separated Form & Chatbot Domains
   ========================================================================== */

// 1. App State
const state = {
  activeMode: "form", // 'form' or 'chat'
  currentStep: 1,     // 1: Place, 2: Taxi, 3: Confirmation

  // Place Block Slots (No redundant region)
  place: {
    domain: "식당",
    name: "두부두부두부",
    type: "한식당",
    detail: "저렴"
  },

  // Taxi Block Slots (Connected & Carried over)
  taxi: {
    departure: "호텔 파크",
    destination: "두부두부두부", // Carried over from place.name
    time: "14:30",
    type: "일반",
    driverPhone: "010-8376-2540",
    bookingCode: "TX-93806"
  },

  // Chatbot Slots State (Dynamic LLM Managed)
  chatSlots: {
    domain: "",
    placeName: "",
    destination: "",
    departure: "",
    time: "",
    type: ""
  },

  // Chat history for multi-turn LLM understanding
  chatHistory: []
};

// Supabase Client Initialization (Reads from window/env or fallback)
const SUPABASE_URL = (typeof window !== "undefined" && (window.SUPABASE_PROJECT_URL || localStorage.getItem("SUPABASE_PROJECT_URL"))) || "https://rammcywajcliobehpzed.supabase.co";
const SUPABASE_ANON_KEY = (typeof window !== "undefined" && (window.SUPABASE_ANON_KEY || localStorage.getItem("SUPABASE_ANON_KEY"))) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbW1jeXdhamNsaW9iZWhwemVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MDgxNzYsImV4cCI6MjEwMzM4NDE3Nn0.YLAO-p9Pu8oHsRYer_gOiUoQ6FMNGJEGQdIsn0gcB2c";

let supabaseClient = null;
if (typeof window !== "undefined" && window.supabase && window.supabase.createClient) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✓ Supabase Client initialized:", SUPABASE_URL);
  } catch (e) {
    console.warn("Supabase initialization error:", e);
  }
}

// Save reservation to Supabase Database (places & taxi_reservations tables)
async function saveReservationToSupabase(placeData, taxiData) {
  if (!supabaseClient) return;
  try {
    // 1. Upsert place record
    if (placeData && placeData.name) {
      await supabaseClient.from("places").upsert({
        domain: placeData.domain || "식당",
        name: placeData.name,
        region: "서울",
        place_type: placeData.type || "일반",
        price_range: placeData.detail || "적당"
      }, { onConflict: "name" });
    }

    // 2. Insert taxi reservation record
    if (taxiData && taxiData.bookingCode) {
      const { data, error } = await supabaseClient.from("taxi_reservations").insert([{
        booking_code: taxiData.bookingCode,
        place_name: taxiData.destination || placeData.name,
        place_domain: placeData.domain || "식당",
        place_region: "서울",
        departure: taxiData.departure,
        destination: taxiData.destination,
        departure_time: taxiData.time,
        taxi_type: taxiData.type || "일반",
        driver_phone: taxiData.driverPhone || "010-8376-2540",
        status: "배차완료"
      }]);

      if (error) {
        console.warn("Supabase insert warning:", error);
      } else {
        console.log("✓ Supabase reservation synced:", taxiData.bookingCode);
        const statusEl = document.getElementById("supabase-save-status");
        if (statusEl) statusEl.textContent = `☁️ Supabase 실시간 DB 저장 완료 (${taxiData.bookingCode})`;
      }
    }
  } catch (err) {
    console.warn("Supabase sync error:", err);
  }
}

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
  initFormValues();
});

// 3. Domain / Mode Switcher
function setMode(mode) {
  state.activeMode = mode;

  document.querySelectorAll(".mode-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".domain-view").forEach(view => view.classList.remove("active"));

  if (mode === "form") {
    document.getElementById("tab-form-mode").classList.add("active");
    document.getElementById("domain-form-view").classList.add("active");
  } else {
    document.getElementById("tab-chat-mode").classList.add("active");
    document.getElementById("domain-chat-view").classList.add("active");
    renderChatSlots();
  }
}

// Known WoS place metadata database
const PLACE_METADATA = {
  "두부두부두부": { type: "한식당", price: "저렴" },
  "주점부리": { type: "주점/포차", price: "저렴" },
  "심미 호스텔": { type: "호스텔", price: "저렴" },
  "에버뉴 호텔": { type: "호텔", price: "적당" },
  "파크 호텔": { type: "호텔", price: "비싼" },
  "체리 에어비앤비": { type: "에어비앤비", price: "비싼" },
  "서울중앙성원": { type: "문화/관람", price: "무료" },
  "가로수길": { type: "쇼핑/거리", price: "무료" },
  "스타필드 코엑스몰": { type: "쇼핑/문화", price: "무료" }
};

function autoResolvePlaceInfo(name, domain) {
  name = name ? name.trim() : "";
  if (PLACE_METADATA[name]) {
    return {
      type: PLACE_METADATA[name].type,
      price: PLACE_METADATA[name].price
    };
  }

  // Heuristic based on name keywords
  if (name.includes("호스텔") || name.includes("게스트")) {
    return { type: "호스텔", price: "저렴" };
  } else if (name.includes("호텔") || name.includes("파크") || name.includes("모텔")) {
    return { type: "호텔/숙소", price: "적당" };
  } else if (name.includes("에어비")) {
    return { type: "에어비앤비", price: "적당" };
  } else if (name.includes("식당") || name.includes("두부") || name.includes("불고기") || name.includes("주점") || name.includes("뷔페") || name.includes("한식")) {
    return { type: "한식당", price: "저렴" };
  }

  // Fallback by domain
  if (domain === "식당") return { type: "한식당", price: "저렴" };
  if (domain === "숙소") return { type: "호텔/숙소", price: "적당" };
  if (domain === "관광") return { type: "관람/명소", price: "무료" };
  return { type: "일반", price: "적당" };
}

// 4. Form Domain: Domain radio handler
function handleDomainChange(domain) {
  state.place.domain = domain;

  document.querySelectorAll(".domain-radio").forEach(r => r.classList.remove("active"));
  const checkedRadio = document.querySelector(`input[name="place-domain"][value="${domain}"]`);
  if (checkedRadio && checkedRadio.parentElement) {
    checkedRadio.parentElement.classList.add("active");
  }

  const inputName = document.getElementById("slot-place-name");
  const inputType = document.getElementById("slot-place-type");
  const inputDetail = document.getElementById("slot-place-detail");

  if (domain === "식당") {
    inputName.value = "두부두부두부";
  } else if (domain === "숙소") {
    inputName.value = "심미 호스텔";
  } else if (domain === "관광") {
    inputName.value = "서울중앙성원";
  }

  const auto = autoResolvePlaceInfo(inputName.value, domain);
  inputType.value = auto.type;
  inputDetail.value = auto.price;
  state.place.type = auto.type;
  state.place.detail = auto.price;
}

function initFormValues() {
  const inputName = document.getElementById("slot-place-name");
  const inputType = document.getElementById("slot-place-type");
  const inputDetail = document.getElementById("slot-place-detail");

  inputName.value = state.place.name;

  const auto = autoResolvePlaceInfo(state.place.name, state.place.domain);
  inputType.value = auto.type;
  inputDetail.value = auto.price;
  state.place.type = auto.type;
  state.place.detail = auto.price;

  document.getElementById("slot-taxi-departure").value = state.taxi.departure;
  document.getElementById("slot-taxi-destination").value = state.taxi.destination;
  document.getElementById("slot-taxi-time").value = state.taxi.time;
  document.getElementById("slot-taxi-type").value = state.taxi.type;

  // Real-time automatic listener when place name is changed by user
  inputName.addEventListener("input", (e) => {
    const resolved = autoResolvePlaceInfo(e.target.value, state.place.domain);
    inputType.value = resolved.type;
    inputDetail.value = resolved.price;
    state.place.type = resolved.type;
    state.place.detail = resolved.price;
  });
}

// 5. Block 1: Submit Place Block ➔ Carry-over to Taxi Block
function submitPlaceBlock() {
  state.place.name = document.getElementById("slot-place-name").value.trim();
  state.place.type = document.getElementById("slot-place-type").value.trim();
  state.place.detail = document.getElementById("slot-place-detail").value.trim();

  state.taxi.destination = state.place.name;
  document.getElementById("slot-taxi-destination").value = state.taxi.destination;
  document.getElementById("carry-place-text").textContent = state.place.name;

  goToStep(2);
}

// 6. Block 2: Submit Taxi Block ➔ Confirmation
function submitTaxiBlock() {
  state.taxi.departure = document.getElementById("slot-taxi-departure").value.trim();
  state.taxi.destination = document.getElementById("slot-taxi-destination").value.trim();
  state.taxi.time = document.getElementById("slot-taxi-time").value;
  state.taxi.type = document.getElementById("slot-taxi-type").value;

  // Generate confirmation info
  state.taxi.bookingCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
  state.taxi.driverPhone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);

  // Update Confirmation Ticket
  document.getElementById("res-booking-code").textContent = state.taxi.bookingCode;
  document.getElementById("res-dep").textContent = state.taxi.departure;
  document.getElementById("res-dest").textContent = state.taxi.destination;
  document.getElementById("res-time").textContent = state.taxi.time;
  document.getElementById("res-type").textContent = state.taxi.type === "dontcare" ? "무관" : `${state.taxi.type} 택시`;
  document.getElementById("res-phone").textContent = state.taxi.driverPhone;
  document.getElementById("res-place-summary").textContent = `${state.place.domain} · ${state.place.name}`;

  // Live save to Supabase Database
  saveReservationToSupabase(state.place, state.taxi);

  goToStep(3);
}

// 7. Step Navigation
function goToStep(step) {
  state.currentStep = step;

  // Update Stepper Nodes
  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`step-node-${i}`);
    if (node) {
      node.classList.remove("active", "completed");
      if (i === step) node.classList.add("active");
      else if (i < step) node.classList.add("completed");
    }
  }

  // Update Form Cards visibility
  document.getElementById("form-block-1").style.display = step === 1 ? "block" : "none";
  document.getElementById("form-block-2").style.display = step === 2 ? "block" : "none";
  document.getElementById("form-block-3").style.display = step === 3 ? "block" : "none";
}

function resetForm() {
  goToStep(1);
  handleDomainChange("식당");
}

// ==========================================================================
// 8. Chatbot Domain: Full LLM Intelligence Engine (Gemini 3.5 Flash Lite)
// ==========================================================================

const GEMINI_API_KEY_FALLBACK = (typeof window !== "undefined" && window.atob) 
  ? window.atob("QVEuQWI4Uk42SmhGQ085QTN5cWtGR2FLNlcxLXIzZEhiM0hrSk5kdE5lWFlDQVE2Z3VvTWc=") 
  : "";

const GEMINI_CONFIG = {
  apiKey: (typeof window !== "undefined" && (window.GEMINI_API_KEY || localStorage.getItem("GEMINI_API_KEY") || GEMINI_API_KEY_FALLBACK)) || "",
  model: "gemini-3.5-flash-lite",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
};

const SYSTEM_PROMPT = `당신은 한국의 [장소 접수 -> 택시 배차] 전문 대화형 AI 어시스턴트입니다.
사용자의 대화 의도와 문맥을 정확히 파악하여 슬롯을 채우고 수정하며, 친절하고 자연스럽게 대화를 이끕니다.

[슬롯 정의]
- domain: "식당", "숙소", "관광" 중 하나 (장소의 성격에 맞게 자동 판단)
- placeName: 사용자가 방문하려는 구체적 장소 이름 (예: "두부두부두부", "심미 호스텔", "룰루 한식뷔페", "창덕궁", "서울역")
- destination: 택시 도착지 (장소명 placeName이 입력/수정되면 자동으로 동일하게 이월됨. 사용자가 별도 도착지를 말하면 그 값으로 수정)
- departure: 택시를 탑승할 출발지 (예: "호텔 파크", "숭실대입구역", "서울역 1번출구", "집")
- time: 탑승/출발 시간 (예: "14:30", "15:00", "지금 바로")
- type: 택시 종류 ("일반 택시", "모범 택시", "고급 택시", "대형 밴", "무관" 중 하나)

[슬롯 추출 및 수정 핵심 규칙]
1. [슬롯 정확성]: 사용자가 말한 단어의 조사를 분석해 정확한 슬롯에 넣으세요.
   - "~에서", "~부터", "출발지는 ~", "출발지가 ~" -> departure (출발지)
   - "~로", "~까지", "~에 가려고", "장소는 ~", "도착지는 ~", "식당 이름은 ~" -> placeName & destination (장소/도착지)
   - "~시", "~분", "지금", "바로", "즉시" -> time (출발 시간)
   - "모범", "고급", "블랙", "대형", "밴", "일반", "아무거나", "상관없어", "무관" -> type (택시 종류)
2. [이월 및 수정]:
   - 장소(placeName)가 입력되거나 수정되면 택시 destination 슬롯도 동일한 값으로 자동 갱신됩니다.
   - 사용자가 "도착지만 서울역으로 해줘" 처럼 도착지만 따로 수정 요청하면 destination만 변경합니다.
   - 사용자가 "출발지 바꿔줘", "시간 바꿔줘", "택시는 모범으로" 처럼 수정을 원할 때는 기존의 다른 슬롯은 그대로 유지한 채 해당 슬롯만 정확히 갱신합니다.
   - "처음부터 다시", "초기화" 요청 시 모든 슬롯을 빈 문자열("")로 비웁니다.
3. [배차 완료 조건]: destination, departure, time, type 4가지 필수 슬롯이 모두 채워졌을 때만 isCompleted를 true로 설정하고 축하 배차 완료 메시지를 작성합니다. 하나라도 비어있으면 isCompleted는 false입니다.
4. [응답 작성]:
   - 부족한 슬롯이 있다면 무엇을 입력해야 하는지 사용자에게 친절하고 명확하게 질문하세요. (HTML <strong> 태그 사용 가능)
   - 이미 채워진 정보를 사용자에게 친절하게 요약 피드백하며 다음 슬롯을 자연스럽게 물어봅니다.

반드시 마크다운 코드블록 없이 아래 순수 JSON 형식으로만 응답하세요:
{
  "slots": {
    "domain": "",
    "placeName": "",
    "destination": "",
    "departure": "",
    "time": "",
    "type": ""
  },
  "isCompleted": false,
  "reply": "사용자에게 보낼 친절한 답변 (HTML <strong> 태그 사용 가능)"
}`;

function handleChatSubmit() {
  const input = document.getElementById("chat-text-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  state.chatHistory.push({ role: "user", text: text });
  input.value = "";

  setTimeout(() => {
    processChatInput(text);
  }, 50);
}

function sendQuickChat(text) {
  document.getElementById("chat-text-input").value = text;
  handleChatSubmit();
}

function addChatMessage(sender, text) {
  const log = document.getElementById("chat-log");
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  msg.innerHTML = `${text} <span class="msg-time">${sender === 'user' ? '사용자' : 'AI 어시스턴트'}</span>`;
  log.appendChild(msg);
  log.scrollTop = log.scrollHeight;
}

async function processChatInput(text) {
  const raw = text.trim();
  if (!raw) return;

  // 1. Primary: Direct Gemini LLM Understanding
  try {
    const recentHistory = state.chatHistory.slice(-6).map(h => `${h.role === 'user' ? '사용자' : 'AI'}: "${h.text}"`).join("\n");
    const prompt = `${SYSTEM_PROMPT}\n\n[현재 슬롯 상태]:\n${JSON.stringify(state.chatSlots, null, 2)}\n\n[이전 대화 기록]:\n${recentHistory || '(없음)'}\n\n[방금 사용자 발화]: "${raw}"`;

    const response = await fetch(`${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed && parsed.slots) {
          // Update all slots accurately from LLM
          for (const [k, v] of Object.entries(parsed.slots)) {
            state.chatSlots[k] = v || "";
          }
          renderChatSlots();

          // Check completion
          const s = state.chatSlots;
          const isFullyReady = s.destination && s.departure && s.time && s.type;

          if (parsed.isCompleted || isFullyReady) {
            const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
            const phone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);

            // Real-time Supabase sync
            saveReservationToSupabase(
              { domain: s.domain, name: s.placeName },
              { bookingCode: bCode, destination: s.destination, departure: s.departure, time: s.time, type: s.type, driverPhone: phone }
            );

            const completeReply = `🎉 <strong>택시 배차가 성공적으로 완료되었습니다!</strong><br>` +
              `- 예약번호: <strong>${bCode}</strong><br>` +
              `- 출발지: ${s.departure} ➔ <strong>도착지: ${s.destination}</strong><br>` +
              `- 탑승 시간: ${s.time} (<strong>${s.type}</strong>)<br>` +
              `- 배정 기사님 번호: <strong>${phone}</strong><br>` +
              `<div class="game-banner-box" style="margin-top: 12px; text-align: center;">` +
              `  <a href="https://adeven-small-one.vercel.app/" target="_blank" rel="noopener noreferrer" class="btn-game-wait" title="택시 기다리는 동안 미니 게임 플레이하기">` +
              `    <span>🎮</span> <span>택시 기다리는 동안 게임하기!</span> <span>➔</span>` +
              `  </a>` +
              `  <p style="font-size: 11px; color: #64748b; margin-top: 6px;">택시가 도착할 때까지 신나는 미니게임을 즐겨보세요 🚗</p>` +
              `</div>` +
              `<small style="color:#0457c8; font-weight:600; margin-top: 8px; display: block;">✨ 기사님께 고객님의 탑승 정보가 정상 전달되었습니다.</small>`;

            addChatMessage("bot", completeReply);
            state.chatHistory.push({ role: "bot", text: "배차 완료" });
            return;
          }

          if (parsed.reply) {
            addChatMessage("bot", parsed.reply);
            state.chatHistory.push({ role: "bot", text: parsed.reply });
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Gemini API call error, applying fallback:", err);
  }

  // 2. Fallback State Machine
  runFallbackEngine(raw);
}

function runFallbackEngine(raw) {
  try {
    let reply = "";
    const s = state.chatSlots;

    // Reset
    if (/처음부터\s*다시|전부\s*다시|초기화/.test(raw)) {
      resetChat();
      return;
    }

    // Departure
    const depMatch = raw.match(/출발지(?:는|가|로|에서|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|이라고|라고|입니다|이야|야]|\s*$)/) || raw.match(/([가-힣a-zA-Z0-9\s]+?)(?:에서|서|부터)\s*/);
    if (depMatch && depMatch[1]) s.departure = depMatch[1].trim();

    // Time
    const timeMatch = raw.match(/(\d{1,2})시\s*(\d{1,2})?분?/) || raw.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      let hour = timeMatch[1].padStart(2, '0');
      let min = timeMatch[2] ? timeMatch[2].padStart(2, '0') : "00";
      s.time = `${hour}:${min}`;
    } else if (/지금|바로|즉시/.test(raw)) {
      s.time = "지금 바로";
    }

    // Taxi Type
    if (/모범/.test(raw)) s.type = "모범 택시";
    else if (/고급|블랙/.test(raw)) s.type = "고급 택시";
    else if (/대형|밴|벤/.test(raw)) s.type = "대형 밴";
    else if (/일반/.test(raw)) s.type = "일반 택시";
    else if (/상관|무관|아무/.test(raw)) s.type = "무관 (dontcare)";

    // Place / Destination
    const placeMatch = raw.match(/([가-힣a-zA-Z0-9\s]+?)(?:가|이|는|은)?\s*(?:식당|숙소|호텔|가게|장소)?\s*(?:이름이야|이름입니다|이름|으로\s*할게|갈게요|갈래)/);
    if (placeMatch && placeMatch[1] && !["출발지", "도착지", "시간", "택시"].includes(placeMatch[1])) {
      s.placeName = placeMatch[1].trim();
      s.destination = s.placeName;
      if (!s.domain) s.domain = /식당|뷔페|밥/.test(s.placeName) ? "식당" : (/호텔|숙소/.test(s.placeName) ? "숙소" : "관광");
    }

    renderChatSlots();

    if (s.destination && s.departure && s.time && s.type) {
      const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
      const phone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);
      saveReservationToSupabase(
        { domain: s.domain, name: s.placeName },
        { bookingCode: bCode, destination: s.destination, departure: s.departure, time: s.time, type: s.type, driverPhone: phone }
      );
      const completeReply = `🎉 <strong>택시 배차가 성공적으로 완료되었습니다!</strong> (예약번호: ${bCode})<br>` +
        `<div class="game-banner-box" style="margin-top: 12px; text-align: center;">` +
        `  <a href="https://adeven-small-one.vercel.app/" target="_blank" rel="noopener noreferrer" class="btn-game-wait" title="택시 기다리는 동안 미니 게임 플레이하기">` +
        `    <span>🎮</span> <span>택시 기다리는 동안 게임하기!</span> <span>➔</span>` +
        `  </a>` +
        `  <p style="font-size: 11px; color: #64748b; margin-top: 6px;">택시가 도착할 때까지 신나는 미니게임을 즐겨보세요 🚗</p>` +
        `</div>`;
      addChatMessage("bot", completeReply);
    } else if (!s.destination) {
      addChatMessage("bot", "어디로 가시나요? 방문하실 <strong>[장소 이름 또는 도착지]</strong>를 말씀해 주세요.");
    } else if (!s.departure) {
      addChatMessage("bot", `장소(${s.destination})가 확인되었습니다. 어디서 탑승하시나요? <strong>[출발지]</strong>를 알려주세요.`);
    } else if (!s.time) {
      addChatMessage("bot", `출발지(${s.departure})가 확인되었습니다. 몇 시에 탑승하시나요? <strong>[출발 시간]</strong>을 알려주세요.`);
    } else if (!s.type) {
      addChatMessage("bot", `원하시는 <strong>택시 종류</strong>를 알려주세요. [일반 / 모범 / 고급 / 대형 / 무관]`);
    }
  } catch (err) {
    console.error("Fallback processing error:", err);
    addChatMessage("bot", "메시지를 처리하는 중 오류가 발생했습니다. 다시 한번 말씀해 주세요.");
  }
}

function renderChatSlots() {
  const s = state.chatSlots;
  updateSlotRow("c-slot-domain", "c-val-domain", s.domain);
  updateSlotRow("c-slot-name", "c-val-name", s.placeName);
  updateSlotRow("c-slot-dest", "c-val-dest", s.destination, true);
  updateSlotRow("c-slot-dep", "c-val-dep", s.departure);
  updateSlotRow("c-slot-time", "c-val-time", s.time);
  updateSlotRow("c-slot-type", "c-val-type", s.type);
}

function updateSlotRow(rowId, valId, val, isCarry = false) {
  const row = document.getElementById(rowId);
  const valEl = document.getElementById(valId);
  if (!row || !valEl) return;

  if (val) {
    valEl.textContent = val;
    row.className = isCarry ? "slot-row auto-carry" : "slot-row filled";
  } else {
    valEl.textContent = "-";
    row.className = "slot-row";
  }
}

function resetChat() {
  state.chatSlots = {
    domain: "",
    placeName: "",
    destination: "",
    departure: "",
    time: "",
    type: ""
  };
  state.chatHistory = [];
  renderChatSlots();
  document.getElementById("chat-log").innerHTML = `
    <div class="msg bot">
      안녕하세요! 택시 예약을 도와드릴게요. 먼저 방문하실 <strong>[장소 이름 또는 도착지]</strong>를 알려주세요.
      <span class="msg-time">장소 접수 ➔ 택시 도착지로 자동 이월</span>
    </div>
  `;
}
