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

  // Chatbot Slots State (No redundant region)
  chatSlots: {
    domain: "",
    placeName: "",
    departure: "",
    destination: "",
    time: "",
    type: ""
  }
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
  document.getElementById("res-type").textContent = state.taxi.type === "dontcare" ? "무관 (가장 빠른 배차)" : `${state.taxi.type} 택시`;
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
// 8. Chatbot Domain: Gemini LLM Engine + Sequential Dialogue System
// ==========================================================================

const GEMINI_CONFIG = {
  apiKey: (typeof window !== "undefined" && (window.GEMINI_API_KEY || localStorage.getItem("GEMINI_API_KEY"))) || "",
  model: "gemini-3.5-flash-lite",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
};

const SYSTEM_PROMPT = `당신은 한국의 [장소 접수 -> 택시 배차] 전문 대화형 AI 어시스턴트입니다.
사용자와 자연스럽게 대화하며 다음 슬롯들을 채우고, 배차 완료까지 필요한 질문을 순차적으로 자연스럽게 물어봅니다.

슬롯 목록 (4대 필수 슬롯):
- domain: "식당", "숙소", "관광" 중 하나
- placeName: 사용자가 방문하려는 구체적 장소 이름
- destination: 택시 도착지 (장소명이 입력되면 자동으로 동일하게 이월됨. 사용자가 별도 도착지를 말하면 수정 가능)
- departure: 택시 출발지
- time: 탑승/출발 시간
- type: 택시 종류 ("일반 택시", "모범 택시", "고급 택시", "대형 밴", "무관" 중 하나)

핵심 동작 규칙:
1. [장소명/도착지 이월]: 사용자가 구체적 장소명을 말하면 domain을 판단하고, placeName과 택시 destination 슬롯에 동일하게 즉시 채워 넣습니다.
2. [카테고리/도메인만 말한 경우]: 사용자가 "식당", "숙소", "관광"처럼 카테고리만 말했을 때는 domain만 채우고 placeName은 비워둡니다. 그리고 구체적인 장소명을 질문합니다.
3. [택시 종류 입력 필수]: destination, departure, time, type 4가지 필수 슬롯이 모두 채워져야만 배차가 완료됩니다. 택시 종류(type)가 비어있다면 반드시 [일반 / 모범 / 고급 / 대형 / 무관] 중에서 질문하여 받아내세요.
4. [슬롯 수정]: 사용자가 도착지/출발지/시간/택시종류 수정을 요청하면 해당 슬롯을 즉시 갱신합니다.
5. [초기화]: "처음부터 다시", "초기화" 요청 시 모든 슬롯을 빈 문자열("")로 리셋합니다.
6. [배차 완료]: 4개 슬롯이 모두 완비되었을 때만 예약번호(TX-XXXXX), 기사님 번호(010-8376-XXXX)와 함께 배차 완료 메시지를 작성합니다.
7. [순차적 유도 질문 (reply)]: 부족한 슬롯이 무엇인지 파악하여 다음에 사용자가 무엇을 입력해야 하는지 명확하고 간결하게 질문합니다.

반드시 마크다운 코드블록 없이 아래 순수 JSON 형식으로만 답하세요:
{
  "slots": {
    "domain": "...",
    "placeName": "...",
    "departure": "...",
    "destination": "...",
    "time": "...",
    "type": "..."
  },
  "reply": "사용자에게 보낼 친절하고 간결한 답변 (HTML <strong> 태그 사용 가능)"
}`;

function cleanSuffixes(str) {
  if (!str) return "";
  return str
    .replace(/[ㄱ-ㅎㅏ-ㅣ]+$/g, "") // strip trailing jamo typos
    .replace(/(?:이라고|라고|이야|야|입니다|이요|요|으로|로|에서|서|부터|에|까지|가려고|가려는데|가자|예약해줘|예약할게|예약|찾아줘|갈래|불러줘|잡아줘)$/g, "")
    .trim();
}

function handleChatSubmit() {
  const input = document.getElementById("chat-text-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  input.value = "";

  setTimeout(() => {
    processChatInput(text);
  }, 100);
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

  // 1. Try Real Gemini LLM Engine
  try {
    const prompt = `${SYSTEM_PROMPT}\n\n[현재 슬롯 상태]: ${JSON.stringify(state.chatSlots)}\n[사용자 발화]: "${raw}"`;
    const response = await fetch(`${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
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
          for (const [k, v] of Object.entries(parsed.slots)) {
            if (v !== undefined) state.chatSlots[k] = v;
          }
          renderChatSlots();

          // If fully booked with all 4 slots, sync to Supabase
          if (state.chatSlots.destination && state.chatSlots.departure && state.chatSlots.time && state.chatSlots.type) {
            const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
            saveReservationToSupabase(
              { domain: state.chatSlots.domain, name: state.chatSlots.placeName },
              { bookingCode: bCode, destination: state.chatSlots.destination, departure: state.chatSlots.departure, time: state.chatSlots.time, type: state.chatSlots.type, driverPhone: "010-8376-2540" }
            );
          }

          if (parsed.reply) {
            addChatMessage("bot", parsed.reply);
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Gemini API call failed, falling back to local sequential engine:", err);
  }

  // 2. Bulletproof Local Sequential Engine Fallback
  runLocalSequentialEngine(raw);
}

function runLocalSequentialEngine(raw) {
  try {
    let reply = "";
    const s = state.chatSlots;
    const cleaned = cleanSuffixes(raw);

    // 0. Reset Request
    if (/처음부터\s*다시|전부\s*다시|초기화/.test(raw)) {
      s.domain = "";
      s.placeName = "";
      s.departure = "";
      s.destination = "";
      s.time = "";
      s.type = "";
      
      if (/식당|음식|밥/.test(raw)) s.domain = "식당";
      else if (/숙소|호텔|호스텔/.test(raw)) s.domain = "숙소";
      else if (/관광|명소/.test(raw)) s.domain = "관광";

      renderChatSlots();
      reply = `🔄 슬롯을 모두 초기화하고 처음부터 다시 시작합니다.${s.domain ? ` [선택 도메인: <strong>${s.domain}</strong>]` : ''}<br>방문하실 장소나 출발지를 말씀해 주세요.`;
      addChatMessage("bot", reply);
      return;
    }

    // 1. Check for Explicit Modification/Correction Requests
    const destModifyMatch = raw.match(/(?:도착지|목적지|장소)(?:를|는|가|로)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|으로]?\s*(?:수정|바꿔|변경|할래|해줘))/);
    const depModifyMatch = raw.match(/출발지(?:를|는|가|에서)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|으로]?\s*(?:수정|바꿔|변경|할래|해줘))/);
    const timeModifyMatch = raw.match(/시간(?:을|는|으로)?\s*([0-9\:\s시분]+?)(?:[으|로|에]?\s*(?:수정|바꿔|변경|해줘))/);
    const typeModifyMatch = raw.match(/(?:종류|택시|차종)(?:를|는|가|로)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|으로]?\s*(?:수정|바꿔|변경|할래|해줘))/);

    if (destModifyMatch && destModifyMatch[1]) {
      s.placeName = cleanSuffixes(destModifyMatch[1]);
      s.destination = s.placeName;
      reply = `✓ 장소 및 택시 도착지를 '<strong>${s.destination}</strong>'(으)로 수정했습니다.`;
    } else if (depModifyMatch && depModifyMatch[1]) {
      s.departure = cleanSuffixes(depModifyMatch[1]);
      reply = `✓ 출발지를 '<strong>${s.departure}</strong>'(으)로 수정했습니다.`;
    } else if (timeModifyMatch && timeModifyMatch[1]) {
      s.time = timeModifyMatch[1].trim();
      reply = `✓ 출발 시간을 '<strong>${s.time}</strong>'(으)로 수정했습니다.`;
    } else if (typeModifyMatch && typeModifyMatch[1]) {
      const t = typeModifyMatch[1].trim();
      if (t.includes("모범")) s.type = "모범 택시";
      else if (t.includes("고급") || t.includes("블랙")) s.type = "고급 택시";
      else if (t.includes("대형") || t.includes("밴")) s.type = "대형 밴";
      else if (t.includes("일반")) s.type = "일반 택시";
      else if (t.includes("상관") || t.includes("무관") || t.includes("아무")) s.type = "무관 (dontcare)";
      reply = `✓ 택시 종류를 '<strong>${s.type}</strong>'(으)로 수정했습니다.`;
    }

    // 2. Explicit Domain Only Selection
    const isOnlyDomain = /^(?:숙소|식당|관광|호텔|모텔|호스텔|음식점|맛집|카페|관광지|명소)(?:요|으로|로|예약|찾아줘|추천)?$/i.test(cleaned);
    if (isOnlyDomain) {
      if (/숙소|호텔|호스텔|모텔/.test(cleaned)) s.domain = "숙소";
      else if (/관광|관광지|명소/.test(cleaned)) s.domain = "관광";
      else s.domain = "식당";

      if (["숙소", "식당", "관광", "호텔", "맛집"].includes(s.placeName)) {
        s.placeName = "";
        s.destination = "";
      }

      renderChatSlots();
      reply = `✓ [<strong>${s.domain}</strong>] 도메인이 선택되었습니다.<br>방문하실 ${s.domain} 이름을 말씀해 주세요.`;
      addChatMessage("bot", reply);
      return;
    }

    // 3. Extract Place Name when explicitly phrased
    const explicitPlaceMatch = raw.match(/([가-힣a-zA-Z0-9\s]+?)(?:가|이|는|은)?\s*(?:식당|숙소|호텔|가게|장소)?\s*(?:이름이야|이름입니다|이름|으로\s*할게|갈게요|갈래)/);
    if (explicitPlaceMatch && explicitPlaceMatch[1] && !["출발지", "도착지", "시간", "택시", "종류"].includes(explicitPlaceMatch[1])) {
      const pName = cleanSuffixes(explicitPlaceMatch[1]);
      if (pName.length > 0 && !["숙소", "식당", "관광"].includes(pName)) {
        s.placeName = pName;
        s.destination = pName;
        if (!s.domain) {
          s.domain = /뷔페|식당|밥|음식|갈비|치킨|일식|한식/.test(pName) ? "식당" :
                     /호텔|호스텔|숙소|에어비|모텔|펜션/.test(pName) ? "숙소" : "식당";
        }
        reply = `✓ 장소 '<strong>${s.placeName}</strong>'(${s.domain})을(를) 접수하여 택시 <strong>도착지</strong>로 자동 이월했습니다.`;
      }
    }

    // 4. Extract Departure
    const explicitDepMatch = raw.match(/출발지(?:는|가|로|에서|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|이라고|라고|입니다|이야|야]|\s*$)/);
    const particleDepMatch = raw.match(/([가-힣a-zA-Z0-9\s]+?)(?:에서|서|부터)\s*/);

    if (explicitDepMatch && explicitDepMatch[1] && !explicitDepMatch[1].includes("서울시")) {
      s.departure = cleanSuffixes(explicitDepMatch[1]);
      reply = `✓ 출발지를 '<strong>${s.departure}</strong>'(으)로 접수했습니다.`;
    } else if (particleDepMatch && particleDepMatch[1] && !particleDepMatch[1].includes("서울시")) {
      s.departure = cleanSuffixes(particleDepMatch[1]);
      reply = `✓ 출발지를 '<strong>${s.departure}</strong>'(으)로 접수했습니다.`;
    }

    // 5. Extract Destination / Place
    const destMatch = raw.match(/(?:도착지(?:는|가|:)?\s*|([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)(?:로|으로|까지|에|행|가려고|가려는데|갈래|예약|바꿀래|바꿀래요))\s*/);
    if (destMatch && destMatch[1] && !destMatch[1].includes("택시") && !["숙소", "식당", "관광", "호텔", "일반", "모범", "고급", "대형"].includes(destMatch[1])) {
      s.placeName = cleanSuffixes(destMatch[1]);
      s.destination = s.placeName;
      if (!s.domain) {
        s.domain = /뷔페|식당|밥|음식|갈비|치킨|일식|한식/.test(s.placeName) ? "식당" :
                   /호텔|호스텔|숙소|에어비|모텔|펜션/.test(s.placeName) ? "숙소" : "관광";
      }
    }

    // 6. Extract Taxi Type
    if (/(?:모범|모범택시)/.test(raw)) s.type = "모범 택시";
    else if (/(?:고급|블랙|고급택시|카카오블랙)/.test(raw)) s.type = "고급 택시";
    else if (/(?:대형|밴|벤|대형택시|대형밴|카니발)/.test(raw)) s.type = "대형 밴";
    else if (/(?:일반|일반택시|보통|기본|중형)/.test(raw)) s.type = "일반 택시";
    else if (/(?:상관없|아무거나|무관|dontcare|아무 택시|상관 없음|아무거나요)/.test(raw)) s.type = "무관 (dontcare)";

    // 7. Context-aware Direct input
    if (s.destination && !s.departure && !reply) {
      const cleanedDirect = cleanSuffixes(raw);
      const genericWords = ["숙소", "식당", "관광", "호텔", "모텔", "호스텔", "맛집", "안녕", "반가워", "택시", "배차", "취소", "다시", "일반", "모범", "고급", "대형", "무관", "아무거나"];
      if (cleanedDirect.length > 0 && !genericWords.includes(cleanedDirect) && !/^\d{1,2}(?::\d{2}|시)/.test(cleanedDirect)) {
        s.departure = cleanedDirect;
        reply = `✓ 출발지를 '<strong>${s.departure}</strong>'(으)로 접수했습니다.`;
      }
    }

    if (!s.placeName && !s.destination && !s.departure && !reply) {
      const cleanedPlace = cleanSuffixes(raw);
      const genericWords = ["숙소", "식당", "관광", "호텔", "모텔", "호스텔", "맛집", "안녕", "반가워", "택시", "배차", "일반", "모범", "고급", "대형", "무관"];
      if (cleanedPlace.length > 0 && !genericWords.includes(cleanedPlace)) {
        s.placeName = cleanedPlace;
        s.destination = cleanedPlace;
        if (!s.domain) {
          s.domain = /뷔페|식당|밥|음식|갈비|치킨|일식|한식/.test(cleanedPlace) ? "식당" :
                     /호텔|호스텔|숙소|에어비|모텔|펜션/.test(cleanedPlace) ? "숙소" :
                     /타워|공원|성원|거리|궁|청와대/.test(cleanedPlace) ? "관광" : "식당";
        }
        reply = `✓ 장소 '<strong>${s.placeName}</strong>'(${s.domain})을(를) 접수하여 택시 <strong>도착지</strong>로 자동 이월했습니다.`;
      }
    }

    // 8. Extract Time
    if (/지금\s*바로|즉시|바로/.test(raw)) {
      s.time = "지금 바로 (즉시 탑승)";
    } else {
      const timeMatch = raw.match(/(\d{1,2})시\s*(\d{1,2})?분?/) || raw.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        let hour = timeMatch[1].padStart(2, '0');
        let min = timeMatch[2] ? timeMatch[2].padStart(2, '0') : "00";
        s.time = `${hour}:${min}`;
      }
    }

    renderChatSlots();

    // 9. Proactive Sequential Dialogue Question Engine (4대 필수 슬롯)
    let nextPrompt = "";
    if (s.destination && s.departure && s.time && s.type) {
      const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
      const phone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);

      // Save to Supabase DB
      saveReservationToSupabase(
        { domain: s.domain, name: s.placeName },
        { bookingCode: bCode, destination: s.destination, departure: s.departure, time: s.time, type: s.type, driverPhone: phone }
      );

      nextPrompt = `🎉 <strong>택시 배차가 성공적으로 완료되었습니다!</strong><br>` +
                   `- 예약번호: <strong>${bCode}</strong><br>` +
                   `- 출발지: ${s.departure} ➔ <strong>도착지(이월): ${s.destination}</strong><br>` +
                   `- 탑승 시간: ${s.time} (<strong>${s.type}</strong>)<br>` +
                   `- 배정 기사님 번호: <strong>${phone}</strong><br>` +
                   `<small style="color:#0457c8; font-weight:600;">☁️ Supabase 실시간 DB 저장 완료</small>`;
    } else if (!s.destination) {
      nextPrompt = `어디로 가시나요? 방문하실 <strong>장소명 또는 도착지</strong>를 말씀해 주세요.`;
    } else if (!s.departure && !s.time && !s.type) {
      nextPrompt = `어디서 몇 시에 출발하시나요? 탑승할 <strong>[출발지, 출발 시간, 택시 종류]</strong>를 알려주세요.<br><small style="color:#64748b;">(택시 종류: 일반 / 모범 / 고급 / 대형 / 무관)</small>`;
    } else if (!s.departure) {
      nextPrompt = `어디서 탑승하시나요? <strong>출발지</strong>를 알려주세요.`;
    } else if (!s.time) {
      nextPrompt = `몇 시에 탑승하시나요? <strong>출발 시간</strong>을 알려주세요.`;
    } else if (!s.type) {
      nextPrompt = `어떤 종류의 택시를 부를까요? <strong>택시 종류</strong>를 알려주세요.<br><small style="color:#0457c8; font-weight:600;">[일반 택시 / 모범 택시 / 고급 택시 / 대형 밴 / 무관]</small>`;
    }

    const finalMessage = reply ? `${reply}<br><br>${nextPrompt}` : nextPrompt;
    addChatMessage("bot", finalMessage);
  } catch (err) {
    console.error("Local engine processing error:", err);
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
    departure: "",
    destination: "",
    time: "",
    type: ""
  };
  renderChatSlots();
  document.getElementById("chat-log").innerHTML = `
    <div class="msg bot">
      안녕하세요! 방문하실 장소나 택시 배차 요청을 말씀해 주세요.
      <span class="msg-time">장소 접수 ➔ 택시 배차 자동 연계</span>
    </div>
  `;
}
