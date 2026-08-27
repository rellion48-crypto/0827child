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

// Known WoS place metadata database
const PLACE_METADATA = {
  "두부두부두부": { type: "한식당", price: "저렴", region: "서울 동쪽" },
  "주점부리": { type: "주점/포차", price: "저렴", region: "서울 동쪽" },
  "심미 호스텔": { type: "호스텔", price: "저렴", region: "서울 서쪽" },
  "에버뉴 호텔": { type: "호텔", price: "적당", region: "서울 동쪽" },
  "파크 호텔": { type: "호텔", price: "비싼", region: "서울 동쪽" },
  "체리 에어비앤비": { type: "에어비앤비", price: "비싼", region: "서울 중앙" },
  "서울중앙성원": { type: "문화/관람", price: "무료", region: "서울 중앙" },
  "가로수길": { type: "쇼핑/거리", price: "무료", region: "서울 남쪽" },
  "스타필드 코엑스몰": { type: "쇼핑/문화", price: "무료", region: "서울 남쪽" }
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
  } else if (name.includes("호텔") || name.includes("파크")) {
    return { type: "호텔", price: "적당" };
  } else if (name.includes("에어비")) {
    return { type: "에어비앤비", price: "적당" };
  } else if (name.includes("식당") || name.includes("두부") || name.includes("불고기") || name.includes("주점")) {
    return { type: "한식당", price: "저렴" };
  }

  // Fallback by domain
  if (domain === "식당") return { type: "한식당", price: "저렴" };
  if (domain === "숙소") return { type: "호텔", price: "적당" };
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
  document.getElementById("slot-place-region").value = state.place.region;

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
// 8. Chatbot Domain: Flexible Natural Language Dialogue & Slot Engine
// ==========================================================================

function cleanSuffixes(str) {
  if (!str) return "";
  return str
    .replace(/(?:이라고|라고|이야|야|입니다|이요|요|으로|로|에|까지|가려고|가려는데|가자|예약해줘|예약할게|예약|찾아줘|갈래|불러줘|잡아줘)$/g, "")
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
  }, 250);
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
  try {
    let reply = "";
    const s = state.chatSlots;
    const raw = text.trim();
    const cleaned = cleanSuffixes(raw);

    // 0. Reset Request (Scenario 9: "처음부터 다시요")
    if (/처음부터\s*다시|전부\s*다시|초기화/.test(raw)) {
      s.domain = "";
      s.placeName = "";
      s.region = "";
      s.departure = "";
      s.destination = "";
      s.time = "";
      s.type = "";
      
      // Check if new domain or place is included in the same utterance (e.g. "처음부터 다시요. 식당으로 할게요")
      if (/식당|음식|밥/.test(raw)) s.domain = "식당";
      else if (/숙소|호텔|호스텔/.test(raw)) s.domain = "숙소";
      else if (/관광|명소/.test(raw)) s.domain = "관광";

      renderChatSlots();
      reply = `🔄 슬롯을 모두 초기화하고 처음부터 다시 시작합니다.${s.domain ? ` [선택 도메인: <strong>${s.domain}</strong>]` : ''}<br>방문하실 장소나 출발지를 말씀해 주세요.`;
      addChatMessage("bot", reply);
      return;
    }

    // 1. Check for Modification/Correction Requests (수정 요청)
    const isCorrection = raw.includes("수정") || raw.includes("바꿔") || raw.includes("변경") || raw.includes("아니고");
    
    const destModifyMatch = raw.match(/(?:도착지|목적지|장소)(?:를|는|가|로)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|으로]?\s*(?:수정|바꿔|변경|할래|해줘))/);
    const depModifyMatch = raw.match(/출발지(?:를|는|가|에서)?\s*([가-힣a-zA-Z0-9\s]+?)(?:[으|로|을|를|에|으로]?\s*(?:수정|바꿔|변경|할래|해줘))/);
    const timeModifyMatch = raw.match(/시간(?:을|는|으로)?\s*([0-9\:\s시분]+?)(?:[으|로|에]?\s*(?:수정|바꿔|변경|해줘))/);

    if (destModifyMatch && destModifyMatch[1]) {
      s.placeName = cleanSuffixes(destModifyMatch[1]);
      s.destination = s.placeName; // Auto Carry-over on place modification (Scenario 7)
      reply = `✓ 장소 및 택시 도착지를 '<strong>${s.destination}</strong>'(으)로 수정했습니다.`;
    } else if (depModifyMatch && depModifyMatch[1]) {
      s.departure = cleanSuffixes(depModifyMatch[1]);
      reply = `✓ 출발지를 '<strong>${s.departure}</strong>'(으)로 수정했습니다.`;
    } else if (timeModifyMatch && timeModifyMatch[1]) {
      s.time = timeModifyMatch[1].trim();
      reply = `✓ 출발 시간을 '<strong>${s.time}</strong>'(으)로 수정했습니다.`;
    }

    // 1.5 Domain Only or Generic Category Input (e.g. "숙소", "식당", "관광", "숙소요", "식당 찾아요")
    const isOnlyDomain = /^(?:숙소|식당|관광|호텔|모텔|호스텔|음식점|맛집|카페|관광지|명소)(?:요|으로|로|예약|찾아줘|추천)?$/i.test(cleaned);
    
    if (isOnlyDomain) {
      if (/숙소|호텔|호스텔|모텔/.test(cleaned)) s.domain = "숙소";
      else if (/관광|관광지|명소/.test(cleaned)) s.domain = "관광";
      else s.domain = "식당";

      // Clear place name if it was mistakenly set as domain word
      if (["숙소", "식당", "관광", "호텔", "맛집"].includes(s.placeName)) {
        s.placeName = "";
        s.destination = "";
      }

      renderChatSlots();
      reply = `✓ [<strong>${s.domain}</strong>] 도메인이 선택되었습니다.<br>방문하실 ${s.domain} 이름이나 원하시는 지역/조건을 말씀해 주세요. (예: "심미 호스텔", "두부두부두부", "서울 서쪽")`;
      addChatMessage("bot", reply);
      return;
    }

    // 1.6 Feature / Category Search (Scenario 1 & 3: "헬스장 있는 숙소", "치킨집 찾아요")
    if (/헬스장|스파|조식|주차/.test(raw) && !s.placeName) {
      s.domain = "숙소";
      renderChatSlots();
      reply = `숙소 조건을 확인했습니다. 추천 장소: <strong>에버뉴 호텔</strong>(스파/헬스장), <strong>심미 호스텔</strong>(조식제공), <strong>파크 호텔</strong>(주차/스파). 가실 곳의 이름을 말씀해 주세요.`;
      addChatMessage("bot", reply);
      return;
    }
    if (/치킨|일식|한식|고기|갈비|포차/.test(raw) && !s.placeName && !s.destination) {
      s.domain = "식당";
      renderChatSlots();
      reply = `식당 종류를 확인했습니다. 가실 식당 이름이나 가고 싶은 지역을 말씀해 주세요. (예: "두부두부두부", "주점부리", "서울 동쪽")`;
      addChatMessage("bot", reply);
      return;
    }

  // 2. Extract Domain if mentioned in sentence
  if (/식당|음식|밥|뷔페|갈비|고기|한식|일식|중식|양식|치킨|카페|베이커리|맛집/.test(raw)) {
    s.domain = "식당";
  } else if (/호텔|숙소|호스텔|모텔|게스트|에어비|펜션|리조트/.test(raw)) {
    s.domain = "숙소";
  } else if (/관광|명소|공원|타워|박물관|미술관|성원|거리|궁|유원지|청와대|경복궁|창덕궁/.test(raw)) {
    s.domain = "관광";
  }

  // 3. Extract Region if mentioned
  const regionMatch = raw.match(/(서울\s*(?:동쪽|서쪽|중앙|남쪽|북쪽|중구|종로|강남|송파|마포|용산|광진))/);
  if (regionMatch) {
    s.region = regionMatch[1].replace(/\s+/g, ' ');
  }

  // 4. Extract Departure ("~에서 / ~서 / ~부터 / 출발지:")
  const depMatch = raw.match(/(?:출발지(?:는|가|:)?\s*|([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)(?:에서|서|부터))\s*/);
  if (depMatch && depMatch[1] && !depMatch[1].includes("서울")) {
    s.departure = cleanSuffixes(depMatch[1]);
  }

  // 5. Extract Destination / Place ("~로 / ~까지 / ~에 / ~가려고 / 도착지:")
  const destMatch = raw.match(/(?:도착지(?:는|가|:)?\s*|([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)(?:로|으로|까지|에|행|가려고|가려는데|갈래|예약|바꿀래|바꿀래요))\s*/);
  if (destMatch && destMatch[1] && !destMatch[1].includes("택시") && !destMatch[1].includes("서울") && !["숙소", "식당", "관광", "호텔"].includes(destMatch[1])) {
    s.placeName = cleanSuffixes(destMatch[1]);
    s.destination = s.placeName; // Auto Carry-over
  }

  // 6. Direct / Single-phrase place input (e.g. "두부두부두부", "남산타워", "창덕궁", "한식뷔페")
  if (!s.placeName && !s.destination && !s.departure && !reply) {
    const cleanedPlace = cleanSuffixes(raw);
    const genericWords = ["숙소", "식당", "관광", "호텔", "모텔", "호스텔", "맛집", "안녕", "반가워", "택시", "배차"];
    if (cleanedPlace.length > 0 && !genericWords.includes(cleanedPlace)) {
      s.placeName = cleanedPlace;
      s.destination = cleanedPlace; // Auto Carry-over
      if (!s.domain) {
        s.domain = /뷔페|식당|밥|음식|갈비|치킨|일식/.test(cleanedPlace) ? "식당" :
                   /호텔|호스텔|숙소|에어비/.test(cleanedPlace) ? "숙소" :
                   /타워|공원|성원|거리|궁|청와대/.test(cleanedPlace) ? "관광" : "식당";
      }
      reply = `✓ 장소 '<strong>${s.placeName}</strong>'(${s.domain})을(를) 접수하여 택시 <strong>도착지</strong>로 자동 이월했습니다.`;
    }
  }

  // 7. Extract Time
  const timeMatch = raw.match(/(\d{1,2})시\s*(\d{1,2})?분?/) || raw.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let hour = timeMatch[1].padStart(2, '0');
    let min = timeMatch[2] ? timeMatch[2].padStart(2, '0') : "00";
    s.time = `${hour}:${min}`;
  }

  // 8. Extract Taxi Type
  if (raw.includes("모범")) s.type = "모범 택시";
  else if (raw.includes("고급") || raw.includes("블랙")) s.type = "고급 택시";
  else if (raw.includes("대형") || raw.includes("밴")) s.type = "대형 밴";
  else if (raw.includes("일반")) s.type = "일반 택시";
  else if (raw.includes("상관없") || raw.includes("아무거나") || raw.includes("무관")) s.type = "무관 (dontcare)";

  renderChatSlots();

  // 9. Generate Conversational Bot Response if not already set
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
    } else if (s.destination && !s.departure) {
      reply = `장소 '<strong>${s.destination}</strong>'이(가) 택시 <strong>도착지</strong>로 등록되었습니다.<br>출발지와 출발 시간을 말씀해 주시면 배차를 완료해 드립니다. (예: "호텔 파크에서 14시 30분에 출발")`;
    } else if (s.departure && !s.destination) {
      reply = `출발지 '<strong>${s.departure}</strong>'이(가) 확인되었습니다. 도착하실 장소명을 말씀해 주세요. (예: "한식뷔페로 가줘")`;
    } else {
      reply = `정보를 반영했습니다. [장소/도착: <strong>${s.destination || s.placeName || '-'}</strong>, 출발: <strong>${s.departure || '-'}</strong>, 시간: <strong>${s.time || '-'}</strong>]<br>배차를 완료하려면 부족한 정보를 말씀해 주세요.`;
    }
  }

  addChatMessage("bot", reply);
  } catch (err) {
    console.error("Chatbot processing error:", err);
    addChatMessage("bot", "메시지를 처리하는 중 일시적인 오류가 발생했습니다. 다시 말씀해 주세요.");
  }
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
