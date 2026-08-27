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

  // Place Block Slots
  place: {
    domain: "식당",
    name: "두부두부두부",
    region: "서울 동쪽",
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

  // Chatbot Slots State
  chatSlots: {
    domain: "",
    placeName: "",
    region: "",
    departure: "",
    destination: "",
    time: "",
    type: ""
  }
};

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
  initFormValues();
  updateChecklistBadges();
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

// 4. Form Domain: Domain radio handler
function handleDomainChange(domain) {
  state.place.domain = domain;

  document.querySelectorAll(".domain-radio").forEach(r => r.classList.remove("active"));
  const checkedRadio = document.querySelector(`input[name="place-domain"][value="${domain}"]`);
  if (checkedRadio && checkedRadio.parentElement) {
    checkedRadio.parentElement.classList.add("active");
  }

  const lblType = document.getElementById("label-place-type");
  const inputType = document.getElementById("slot-place-type");
  const lblDetail = document.getElementById("label-place-detail");
  const inputDetail = document.getElementById("slot-place-detail");
  const inputName = document.getElementById("slot-place-name");

  if (domain === "식당") {
    lblType.textContent = "종류 (음식 종류)";
    inputType.placeholder = "예: 한식당, 일식, 양식 등";
    lblDetail.textContent = "가격대 / 주류 여부";
    inputDetail.placeholder = "예: 저렴, 적당, 주류 판매";
    inputName.value = "두부두부두부";
    inputType.value = "한식당";
  } else if (domain === "숙소") {
    lblType.textContent = "종류 (숙소 종류)";
    inputType.placeholder = "예: 호텔, 호스텔, 에어비앤비 등";
    lblDetail.textContent = "가격대 / 시설 (주차/스파/조식)";
    inputDetail.placeholder = "예: 조식 제공, 주차 가능, 스파";
    inputName.value = "심미 호스텔";
    inputType.value = "호스텔";
  } else if (domain === "관광") {
    lblType.textContent = "종류 (관광 형태)";
    inputType.placeholder = "예: 쇼핑, 관람, 문화체험 등";
    lblDetail.textContent = "입장료 / 특이사항";
    inputDetail.placeholder = "예: 무료 입장, 교육적";
    inputName.value = "서울중앙성원";
    inputType.value = "문화/관람";
  }
}

function initFormValues() {
  document.getElementById("slot-place-name").value = state.place.name;
  document.getElementById("slot-place-region").value = state.place.region;
  document.getElementById("slot-place-type").value = state.place.type;
  document.getElementById("slot-place-detail").value = state.place.detail;

  document.getElementById("slot-taxi-departure").value = state.taxi.departure;
  document.getElementById("slot-taxi-destination").value = state.taxi.destination;
  document.getElementById("slot-taxi-time").value = state.taxi.time;
  document.getElementById("slot-taxi-type").value = state.taxi.type;
}

// 5. Block 1: Submit Place Block ➔ Carry-over to Taxi Block
function submitPlaceBlock() {
  state.place.name = document.getElementById("slot-place-name").value.trim();
  state.place.region = document.getElementById("slot-place-region").value;
  state.place.type = document.getElementById("slot-place-type").value.trim();
  state.place.detail = document.getElementById("slot-place-detail").value.trim();

  // [CHECKLIST REQUIREMENT 2: 도착지 자동 이월]
  // Carry-over place name as taxi destination
  state.taxi.destination = state.place.name;
  document.getElementById("slot-taxi-destination").value = state.taxi.destination;
  document.getElementById("carry-place-text").textContent = state.place.name;

  // [CHECKLIST REQUIREMENT 1: 두 블록 연계]
  goToStep(2);
  updateChecklistBadges();
}

// 6. Block 2: Submit Taxi Block ➔ Confirmation
function submitTaxiBlock() {
  // [CHECKLIST REQUIREMENT 3: 슬롯 수정 반영]
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
  document.getElementById("res-place-summary").textContent = `${state.place.domain} · ${state.place.name} (${state.place.region})`;

  goToStep(3);
  updateChecklistBadges();
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

function updateChecklistBadges() {
  const b1 = document.getElementById("chk-connected");
  const b2 = document.getElementById("chk-carried");
  const b3 = document.getElementById("chk-editable");

  if (state.currentStep >= 2) {
    b1.style.background = "#e6f7ef";
    b1.style.borderColor = "#0d8a4f";
    b2.style.background = "#e6f7ef";
    b2.style.borderColor = "#0d8a4f";
  }
}

// ==========================================================================
// 8. Chatbot Domain: Dialogue & Slot Engine
// ==========================================================================

function handleChatSubmit() {
  const input = document.getElementById("chat-text-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  input.value = "";

  setTimeout(() => {
    processChatInput(text);
  }, 300);
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

function processChatInput(text) {
  let reply = "";
  const s = state.chatSlots;

  // 1. Extract Place Domain
  if (text.includes("식당") || text.includes("음식") || text.includes("밥")) s.domain = "식당";
  else if (text.includes("숙소") || text.includes("호텔") || text.includes("호스텔")) s.domain = "숙소";
  else if (text.includes("관광") || text.includes("명소")) s.domain = "관광";

  // 2. Extract Place Name
  if (text.includes("두부두부두부")) s.placeName = "두부두부두부";
  else if (text.includes("심미 호스텔")) s.placeName = "심미 호스텔";
  else if (text.includes("서울중앙성원")) s.placeName = "서울중앙성원";
  else if (text.includes("에버뉴 호텔")) s.placeName = "에버뉴 호텔";
  else if (text.includes("파크 호텔")) s.placeName = "파크 호텔";

  // 3. Extract Region
  if (text.includes("서울 동쪽")) s.region = "서울 동쪽";
  else if (text.includes("서울 중앙")) s.region = "서울 중앙";
  else if (text.includes("서울 서쪽")) s.region = "서울 서쪽";
  else if (text.includes("서울 남쪽")) s.region = "서울 남쪽";
  else if (text.includes("서울 북쪽")) s.region = "서울 북쪽";

  // 4. Extract Modifications / Corrections (수정 처리)
  if (text.includes("수정") || text.includes("바꿔") || text.includes("변경")) {
    if (text.includes("도착지") || text.includes("목적지")) {
      const match = text.match(/도착지(?:를|는)?\s*([가-힣a-zA-Z0-9\s]+?)(?:으?로|을|\s*수정|\s*바꿔)/);
      if (match && match[1]) {
        s.destination = match[1].trim();
      } else if (s.placeName) {
        s.destination = s.placeName;
      }
      reply = `✓ 도착지를 '${s.destination}'(으)로 수정했습니다.`;
    }
    if (text.includes("출발지")) {
      const match = text.match(/출발지(?:를|는)?\s*([가-힣a-zA-Z0-9\s]+?)(?:으?로|을|\s*수정|\s*바꿔)/);
      if (match && match[1]) s.departure = match[1].trim();
      reply = `✓ 출발지를 '${s.departure}'(으)로 수정했습니다.`;
    }
  }

  // 5. Carry-over logic: When placeName is identified and destination is not manually overwritten
  if (s.placeName && !s.destination) {
    s.destination = s.placeName;
  }

  // 6. Extract Departure
  if (text.includes("호텔 파크")) s.departure = "호텔 파크";
  else if (text.includes("명동역")) s.departure = "명동역";
  else if (text.includes("서울역")) s.departure = "서울역";

  // 7. Extract Time
  const timeMatch = text.match(/(\d{1,2})시\s*(\d{1,2})?분?/) || text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let hour = timeMatch[1].padStart(2, '0');
    let min = timeMatch[2] ? timeMatch[2].padStart(2, '0') : "00";
    s.time = `${hour}:${min}`;
  }

  // 8. Extract Taxi Type
  if (text.includes("모범")) s.type = "모범 택시";
  else if (text.includes("고급")) s.type = "고급 택시";
  else if (text.includes("대형")) s.type = "대형 밴";
  else if (text.includes("일반")) s.type = "일반 택시";
  else if (text.includes("상관없") || text.includes("아무거나")) s.type = "무관 (dontcare)";

  renderChatSlots();

  // Generate conversational bot response
  if (!reply) {
    if (s.departure && s.destination && s.time) {
      const bCode = "TX-" + Math.floor(10000 + Math.random() * 90000);
      const phone = "010-8376-" + Math.floor(1000 + Math.random() * 9000);
      reply = `🎉 <strong>택시 배차가 완료되었습니다!</strong><br>` +
              `- 예약번호: <strong>${bCode}</strong><br>` +
              `- 출발: ${s.departure} ➔ <strong>도착(이월): ${s.destination}</strong><br>` +
              `- 출발 시간: ${s.time} (${s.type || '일반 택시'})<br>` +
              `- 기사님 번호: <strong>${phone}</strong><br>` +
              `<em>(필요 시 "도착지를 서울역으로 수정해줘" 처럼 입력하여 언제든 수정할 수 있습니다.)</em>`;
    } else if (s.placeName && !s.departure) {
      reply = `장소 '<strong>${s.placeName}</strong>'이(가) 접수되어 택시 <strong>도착지</strong>로 자동 이월되었습니다.<br>출발지와 원하시는 출발 시간을 말씀해 주시면 배차해 드리겠습니다. (예: "호텔 파크에서 14시 30분에 일반 택시 불러줘")`;
    } else {
      reply = `정보가 반영되었습니다. [장소: ${s.placeName || '-'}, 출발: ${s.departure || '-'}, 도착(이월): ${s.destination || '-'}, 시간: ${s.time || '-'}]<br>배차를 완료하려면 부족한 정보를 말씀해 주세요.`;
    }
  }

  addChatMessage("bot", reply);
}

function renderChatSlots() {
  const s = state.chatSlots;
  updateSlotRow("c-slot-domain", "c-val-domain", s.domain);
  updateSlotRow("c-slot-name", "c-val-name", s.placeName);
  updateSlotRow("c-slot-region", "c-val-region", s.region);
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
    region: "",
    departure: "",
    destination: "",
    time: "",
    type: ""
  };
  renderChatSlots();
  document.getElementById("chat-log").innerHTML = `
    <div class="msg bot">
      안녕하세요! 방문하실 장소(식당/숙소/관광)나 택시 배차 요청을 말씀해 주세요.
      <span class="msg-time">장소 접수 ➔ 택시 배차 자동 연계</span>
    </div>
  `;
}
