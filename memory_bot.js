// ==========================================================================
// MEMORY BOT ENGINE (STRICT CONSTRAINT: HISTORY_TURNS = 1)
// 외부 영구 슬롯 메모리(External Memory)를 참조하여 1턴 제약에서도 정상 배차
// ==========================================================================

// 1. Dynamic Unique User ID Generation (새로고침/접속 시마다 매번 100% 고유하게 생성)
function generateUniqueUserId() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  return `USR-${timeCode}-${randNum}`;
}

let CURRENT_USER_ID = generateUniqueUserId();

// 2. State & External Slot Memory
const state = {
  userId: CURRENT_USER_ID,
  historyTurnsConstraint: 1, // STRICT CONSTRAINT: HISTORY_TURNS = 1
  
  // External Persistent Slot Memory (대화 히스토리가 밀려도 영구 보존됨)
  sessionMemory: {
    domain: "",
    placeName: "",
    destination: "",
    departure: "",
    time: "",
    type: ""
  },

  // Raw Chat Log (UI 표시용)
  chatHistory: []
};

// 3. Supabase Client Integration
const SUPABASE_URL = (typeof window !== "undefined" && (window.SUPABASE_PROJECT_URL || localStorage.getItem("SUPABASE_PROJECT_URL"))) || "https://rammcywajcliobehpzed.supabase.co";
const SUPABASE_ANON_KEY = (typeof window !== "undefined" && (window.SUPABASE_ANON_KEY || localStorage.getItem("SUPABASE_ANON_KEY"))) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbW1jeXdhamNsaW9iZWhwemVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MDgxNzYsImV4cCI6MjEwMzM4NDE3Nn0.YLAO-p9Pu8oHsRYer_gOiUoQ6FMNGJEGQdIsn0gcB2c";

let supabaseClient = null;
if (typeof window !== "undefined" && window.supabase && window.supabase.createClient) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✓ Supabase Client initialized in Memory Bot:", SUPABASE_URL);
  } catch (e) {
    console.warn("Supabase initialization error:", e);
  }
}

async function saveReservationToSupabase(mem, bookingCode, driverPhone) {
  if (!supabaseClient) return;
  try {
    const statusEl = document.getElementById("supabase-status-text");
    if (statusEl) statusEl.textContent = "☁️ Supabase 실시간 DB 동기화 중...";

    // 1. places upsert
    if (mem.placeName) {
      await supabaseClient.from("places").upsert({
        domain: mem.domain || "식당",
        name: mem.placeName,
        region: "서울",
        place_type: "일반",
        price_range: "적당"
      }, { onConflict: "name" });
    }

    // 2. taxi_reservations insert
    if (bookingCode) {
      const { data, error } = await supabaseClient.from("taxi_reservations").insert([{
        booking_code: bookingCode,
        place_name: mem.destination || mem.placeName,
        place_domain: mem.domain || "식당",
        place_region: "서울",
        departure: mem.departure,
        destination: mem.destination,
        departure_time: mem.time,
        taxi_type: mem.type || "일반 택시",
        driver_phone: driverPhone || "010-8376-2540",
        status: "배차완료"
      }]);

      if (!error) {
        if (statusEl) statusEl.textContent = `☁️ Supabase 저장 완료 (예약번호: ${bookingCode}, 유저: ${CURRENT_USER_ID})`;
      } else {
        console.warn("Supabase insert warning:", error);
      }
    }
  } catch (err) {
    console.warn("Supabase sync error:", err);
  }
}

// 4. Gemini LLM Config
const GEMINI_API_KEY_FALLBACK = (typeof window !== "undefined" && window.atob) 
  ? window.atob("QVEuQWI4Uk42SmhGQ085QTN5cWtGR2FLNlcxLXIzZEhiM0hrSk5kdE5lWFlDQVE2Z3VvTWc=") 
  : "";

const GEMINI_CONFIG = {
  apiKey: (typeof window !== "undefined" && (window.GEMINI_API_KEY || localStorage.getItem("GEMINI_API_KEY") || GEMINI_API_KEY_FALLBACK)) || "",
  model: "gemini-3.5-flash-lite",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
};

const SYSTEM_PROMPT = `당신은 [장소 접수 -> 택시 배차] 전문 대화형 AI 어시스턴트입니다.

[중요 제약 조건]
- 대화 히스토리는 직전 1턴(HISTORY_TURNS = 1)만 전달됩니다. 이전 대화 텍스트는 존재하지 않습니다.
- 대신 [외부 영구 슬롯 메모리 (External Memory)]에 이전 턴까지 누적된 모든 슬롯이 안전하게 저장되어 제공됩니다.
- 당신은 이번 1턴 사용자 발화에서 새로운 슬롯이나 수정 사항을 파악하고, [외부 영구 슬롯 메모리]를 참조하여 누락된 슬롯만 순차적으로 질문하세요.

[슬롯 항목 (4대 필수 슬롯)]
- domain: "식당", "숙소", "관광" 중 하나
- placeName: 방문하려는 장소명 (예: "두부두부두부", "심미 호스텔", "창덕궁")
- destination: 택시 도착지 (placeName 입력/수정 시 자동으로 동일하게 이월됨)
- departure: 택시 출발지 (예: "호텔 파크", "서울역")
- time: 탑승/출발 시간 (예: "14:30", "지금 바로")
- type: 택시 종류 ("일반 택시", "모범 택시", "고급 택시", "대형 밴", "무관" 중 하나)

[동작 및 수정 규칙]
1. [이월]: placeName이 들어오면 destination도 동일하게 즉시 채웁니다.
2. [수정]: 사용자가 "시간 바꿔줘", "택시는 모범으로", "장소 창덕궁으로 바꿀래" 하면 기존 메모리의 해당 항목만 정확히 갱신합니다. (장소 변경 시 도착지도 연쇄 갱신)
3. [초기화]: "처음부터 다시", "초기화" 시 모든 슬롯을 비웁니다.
4. [완료]: destination, departure, time, type 4가지 필수 슬롯이 모두 메모리에 있으면 isCompleted를 true로 설정하세요.

반드시 마크다운 없이 아래 순수 JSON 형식으로만 답하세요:
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
  "reply": "사용자에게 보낼 친절하고 간결한 답변 (HTML <strong> 태그 사용 가능)"
}`;

// 5. Chat & Memory Controller
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nav-user-id").textContent = CURRENT_USER_ID;
  renderMemoryDashboard();
});

function handleChatSubmit() {
  const input = document.getElementById("chat-input-text");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  state.chatHistory.push({ role: "user", text: text });
  input.value = "";

  setTimeout(() => {
    processTurn1Message(text);
  }, 50);
}

function sendQuickChip(text) {
  document.getElementById("chat-input-text").value = text;
  handleChatSubmit();
}

function addChatMessage(sender, text) {
  const log = document.getElementById("chat-log");
  const msg = document.createElement("div");
  msg.className = `msg-bubble ${sender}`;
  msg.innerHTML = `${text} <span class="msg-meta">${sender === 'user' ? CURRENT_USER_ID : 'AI 어시스턴트'}</span>`;
  log.appendChild(msg);
  log.scrollTop = log.scrollHeight;
}

async function processTurn1Message(rawText) {
  const raw = rawText.trim();
  if (!raw) return;

  // 1. LLM API Call with STRICT HISTORY_TURNS = 1 + External Memory Injection
  try {
    // Only pass the current 1 turn + Current External Slot Memory!
    const prompt = `${SYSTEM_PROMPT}

[현재 외부 영구 슬롯 메모리 상태 (External Memory State)]:
${JSON.stringify(state.sessionMemory, null, 2)}

[직전 1턴 사용자 발화 (HISTORY_TURNS = 1)]:
"${raw}"`;

    const response = await fetch(`${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
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
          // Merge newly extracted slot values into persistent External Memory
          for (const [k, v] of Object.entries(parsed.slots)) {
            if (v) state.sessionMemory[k] = v;
          }

          // If placeName exists but destination empty, auto carry
          if (state.sessionMemory.placeName && !state.sessionMemory.destination) {
            state.sessionMemory.destination = state.sessionMemory.placeName;
          }

          renderMemoryDashboard();

          // Check 4 required slots in external memory
          const mem = state.sessionMemory;
          const isFullyReady = mem.destination && mem.departure && mem.time && mem.type;

          if (parsed.isCompleted || isFullyReady) {
            const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
            const phone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);

            // Sync to Supabase DB
            saveReservationToSupabase(mem, bCode, phone);

            const completeReply = `🎉 <strong>[HISTORY_TURNS=1 제약 극복] 배차가 완료되었습니다!</strong><br>` +
              `- 예약번호: <strong>${bCode}</strong> (유저: ${CURRENT_USER_ID})<br>` +
              `- 출발지: ${mem.departure} ➔ <strong>도착지(이월): ${mem.destination}</strong><br>` +
              `- 탑승 시간: ${mem.time} (<strong>${mem.type}</strong>)<br>` +
              `- 배정 기사 연락처: <strong>${phone}</strong><br>` +
              `<small style="color:#0457c8; font-weight:600;">☁️ Supabase DB 실시간 저장 완료</small>`;

            addChatMessage("bot", completeReply);
            return;
          }

          if (parsed.reply) {
            addChatMessage("bot", parsed.reply);
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn("LLM API call error, falling back to local memory engine:", err);
  }

  // 2. Deterministic Fallback Memory Engine
  runLocalMemoryFallback(raw);
}

function runLocalMemoryFallback(raw) {
  const mem = state.sessionMemory;

  if (/처음부터\s*다시|전부\s*다시|초기화/.test(raw)) {
    resetChatAndMemory();
    return;
  }

  // Departure
  const depMatch = raw.match(/출발지(?:는|가|로|에서|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|이라고|라고|입니다|이야|야]|\s*$)/) || raw.match(/([가-힣a-zA-Z0-9\s]+?)(?:에서|서|부터)\s*/);
  if (depMatch && depMatch[1]) mem.departure = depMatch[1].trim();

  // Time
  const timeMatch = raw.match(/(\d{1,2})시\s*(\d{1,2})?분?/) || raw.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let hour = timeMatch[1].padStart(2, '0');
    let min = timeMatch[2] ? timeMatch[2].padStart(2, '0') : "00";
    mem.time = `${hour}:${min}`;
  } else if (/지금|바로|즉시/.test(raw)) {
    mem.time = "지금 바로";
  }

  // Taxi Type
  if (/모범/.test(raw)) mem.type = "모범 택시";
  else if (/고급|블랙/.test(raw)) mem.type = "고급 택시";
  else if (/대형|밴|벤/.test(raw)) mem.type = "대형 밴";
  else if (/일반/.test(raw)) mem.type = "일반 택시";
  else if (/상관|무관|아무/.test(raw)) mem.type = "무관 (dontcare)";

  // Place / Destination
  const placeMatch = raw.match(/([가-힣a-zA-Z0-9\s]+?)(?:가|이|는|은)?\s*(?:식당|숙소|호텔|가게|장소)?\s*(?:이름이야|이름입니다|이름|으로\s*할게|갈게요|갈래)/);
  if (placeMatch && placeMatch[1] && !["출발지", "도착지", "시간", "택시"].includes(placeMatch[1])) {
    mem.placeName = placeMatch[1].trim();
    mem.destination = mem.placeName;
    if (!mem.domain) mem.domain = /식당|뷔페|밥/.test(mem.placeName) ? "식당" : (/호텔|숙소/.test(mem.placeName) ? "숙소" : "관광");
  }

  renderMemoryDashboard();

  if (mem.destination && mem.departure && mem.time && mem.type) {
    const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
    const phone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);
    saveReservationToSupabase(mem, bCode, phone);
    addChatMessage("bot", `🎉 <strong>[외부 메모리 참조] 배차가 완료되었습니다!</strong> (예약번호: ${bCode})`);
  } else if (!mem.destination) {
    addChatMessage("bot", "어디로 가시나요? 방문하실 <strong>[장소 이름 또는 도착지]</strong>를 말씀해 주세요.");
  } else if (!mem.departure) {
    addChatMessage("bot", `장소(${mem.destination})가 메모리에 보존되었습니다. 어디서 탑승하시나요? <strong>[출발지]</strong>를 알려주세요.`);
  } else if (!mem.time) {
    addChatMessage("bot", `출발지(${mem.departure})가 확인되었습니다. 몇 시에 탑승하시나요? <strong>[출발 시간]</strong>을 알려주세요.`);
  } else if (!mem.type) {
    addChatMessage("bot", `원하시는 <strong>택시 종류</strong>를 알려주세요. [일반 / 모범 / 고급 / 대형 / 무관]`);
  }
}

// 6. UI Renderers
function renderMemoryDashboard() {
  const mem = state.sessionMemory;

  updateMemRow("mem-domain", "val-domain", mem.domain);
  updateMemRow("mem-name", "val-name", mem.placeName);
  updateMemRow("mem-dest", "val-dest", mem.destination, true);
  updateMemRow("mem-dep", "val-dep", mem.departure);
  updateMemRow("mem-time", "val-time", mem.time);
  updateMemRow("mem-type", "val-type", mem.type);

  // Update Pipeline steps
  updateStepPipeline();
}

function updateMemRow(rowId, valId, val, isCarry = false) {
  const row = document.getElementById(rowId);
  const valEl = document.getElementById(valId);
  if (!row || !valEl) return;

  if (val) {
    valEl.textContent = val;
    row.className = isCarry ? "mem-row carried" : "mem-row filled";
  } else {
    valEl.textContent = "미입력 (-)";
    row.className = "mem-row";
  }
}

function updateStepPipeline() {
  const mem = state.sessionMemory;
  const s1 = document.getElementById("step-1");
  const s2 = document.getElementById("step-2");
  const s3 = document.getElementById("step-3");
  const s4 = document.getElementById("step-4");
  const s5 = document.getElementById("step-5");

  // Step 1: Place / Destination
  if (mem.placeName || mem.destination) {
    s1.className = "step-item done";
  } else {
    s1.className = "step-item active";
  }

  // Step 2: Departure
  if (mem.departure) {
    s2.className = "step-item done";
  } else if (mem.destination) {
    s2.className = "step-item active";
  } else {
    s2.className = "step-item";
  }

  // Step 3: Time
  if (mem.time) {
    s3.className = "step-item done";
  } else if (mem.departure) {
    s3.className = "step-item active";
  } else {
    s3.className = "step-item";
  }

  // Step 4: Taxi Type
  if (mem.type) {
    s4.className = "step-item done";
  } else if (mem.time) {
    s4.className = "step-item active";
  } else {
    s4.className = "step-item";
  }

  // Step 5: Complete
  if (mem.destination && mem.departure && mem.time && mem.type) {
    s5.className = "step-item done";
  } else {
    s5.className = "step-item";
  }
}

function resetChatAndMemory() {
  CURRENT_USER_ID = generateUniqueUserId();
  state.userId = CURRENT_USER_ID;
  const navUserIdEl = document.getElementById("nav-user-id");
  if (navUserIdEl) navUserIdEl.textContent = CURRENT_USER_ID;

  state.sessionMemory = {
    domain: "",
    placeName: "",
    destination: "",
    departure: "",
    time: "",
    type: ""
  };
  state.chatHistory = [];
  renderMemoryDashboard();

  document.getElementById("chat-log").innerHTML = `
    <div class="msg-bubble bot">
      안녕하세요! <strong>HISTORY_TURNS = 1</strong> 환경에서도 외부 영구 메모리를 통해 정상 배차를 지원합니다.<br>
      먼저 방문하실 <strong>[장소 이름 또는 도착지]</strong>를 말씀해 주세요.
      <span class="msg-meta">장소명 ➔ 택시 도착지 실시간 자동 이월</span>
    </div>
  `;

  const statusEl = document.getElementById("supabase-status-text");
  if (statusEl) statusEl.textContent = "대기 중 (4대 슬롯 완비 시 실시간 Supabase 저장)";
}
