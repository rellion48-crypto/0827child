import os
from PIL import Image, ImageDraw, ImageFont

def generate_flow_diagram():
    # 1. Canvas Settings (High-Res 1600 x 960)
    W, H = 1600, 960
    img = Image.new("RGB", (W, H), "#F8FAFC")
    draw = ImageDraw.Draw(img)

    # 2. Fonts
    font_path_bold = "C:/Windows/Fonts/malgunbd.ttf"
    font_path_regular = "C:/Windows/Fonts/malgun.ttf"

    f_title = ImageFont.truetype(font_path_bold, 32)
    f_subtitle = ImageFont.truetype(font_path_regular, 16)
    f_box_header = ImageFont.truetype(font_path_bold, 21)
    f_sec_title = ImageFont.truetype(font_path_bold, 16)
    f_body = ImageFont.truetype(font_path_regular, 15)
    f_body_bold = ImageFont.truetype(font_path_bold, 15)
    f_badge_title = ImageFont.truetype(font_path_bold, 15)
    f_badge_text = ImageFont.truetype(font_path_bold, 13)
    f_loop_title = ImageFont.truetype(font_path_bold, 16)
    f_loop_desc = ImageFont.truetype(font_path_regular, 13)

    # Color Palette
    C_PRIMARY = "#0457C8"      # Cobalt Blue
    C_PRIMARY_LIGHT = "#EFF6FF"
    C_SUCCESS = "#0D8A4F"      # Emerald Green
    C_SUCCESS_LIGHT = "#ECFDF5"
    C_ACCENT = "#D97706"       # Amber / Gold
    C_ACCENT_LIGHT = "#FEF3C7"
    C_PURPLE = "#7C3AED"       # Purple
    C_PURPLE_LIGHT = "#F5F3FF"
    C_TEXT_MAIN = "#0F172A"    # Slate 900
    C_TEXT_MUTED = "#64748B"   # Slate 500
    C_BORDER = "#CBD5E1"       # Slate 300
    C_WHITE = "#FFFFFF"

    # Helper function for drawing rounded rectangles with borders
    def draw_card(xy, fill=C_WHITE, outline=C_BORDER, radius=12, width=2):
        draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

    # Helper function for drawing arrows
    def draw_arrow(start_x, start_y, end_x, end_y, color=C_PRIMARY, line_width=4, arrow_size=14):
        draw.line([(start_x, start_y), (end_x, end_y)], fill=color, width=line_width)
        if start_x < end_x: # Right
            draw.polygon([
                (end_x, end_y),
                (end_x - arrow_size, end_y - int(arrow_size * 0.6)),
                (end_x - arrow_size, end_y + int(arrow_size * 0.6))
            ], fill=color)
        elif start_x > end_x: # Left
            draw.polygon([
                (end_x, end_y),
                (end_x + arrow_size, end_y - int(arrow_size * 0.6)),
                (end_x + arrow_size, end_y + int(arrow_size * 0.6))
            ], fill=color)
        elif start_y > end_y: # Up
            draw.polygon([
                (end_x, end_y),
                (end_x - int(arrow_size * 0.6), end_y + arrow_size),
                (end_x + int(arrow_size * 0.6), end_y + arrow_size)
            ], fill=color)
        elif start_y < end_y: # Down
            draw.polygon([
                (end_x, end_y),
                (end_x - int(arrow_size * 0.6), end_y - arrow_size),
                (end_x + int(arrow_size * 0.6), end_y - arrow_size)
            ], fill=color)

    # =========================================================================
    # 1. Header Banner
    # =========================================================================
    draw.text((60, 36), "장소 접수 -> 택시 배차 프로세스 플로우 (Flow Diagram)", font=f_title, fill=C_TEXT_MAIN)
    draw.text((60, 80), "단일 데이터 파이프라인 : 슬롯 자동 이월 · 자동 완성 · 3단 수정 복귀 루프", font=f_subtitle, fill=C_TEXT_MUTED)

    draw.line([(60, 112), (W - 60, 112)], fill="#E2E8F0", width=2)

    # =========================================================================
    # 2. Main 3-Block Flow (Horizontal Layout)
    # =========================================================================
    box_y = 135
    box_w = 420
    box_h = 440

    b1_x = 60
    b2_x = 590
    b3_x = 1120

    # -------------------------------------------------------------------------
    # [BLOCK 1] 장소 접수 블록
    # -------------------------------------------------------------------------
    draw_card((b1_x, box_y, b1_x + box_w, box_y + box_h), fill=C_WHITE, outline=C_PRIMARY, radius=14, width=3)
    draw.rounded_rectangle((b1_x, box_y, b1_x + box_w, box_y + 55), radius=14, fill=C_PRIMARY)
    draw.rectangle((b1_x, box_y + 35, b1_x + box_w, box_y + 55), fill=C_PRIMARY)
    draw.text((b1_x + 20, box_y + 14), "[1단계] 장소 접수 블록", font=f_box_header, fill=C_WHITE)

    # Section 1-A: 묻는 것 (User Input)
    sy = box_y + 70
    draw_card((b1_x + 16, sy, b1_x + box_w - 16, sy + 130), fill="#F8FAFC", outline="#E2E8F0", radius=10, width=1)
    draw.text((b1_x + 28, sy + 12), "(1) 사용자에게 묻는 것 (Input)", font=f_sec_title, fill="#1E40AF")
    draw.text((b1_x + 28, sy + 44), "• 도메인 : 식당 / 숙소 / 관광", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b1_x + 28, sy + 72), "• 장소 이름 : 방문할 장소명 직접 입력", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b1_x + 44, sy + 98), "(예: 두부두부두부, 심미 호스텔, 룰루 한식뷔페)", font=f_loop_desc, fill=C_TEXT_MUTED)

    # Section 1-B: 자동 채움 (Auto Resolve)
    sy2 = sy + 145
    draw_card((b1_x + 16, sy2, b1_x + box_w - 16, sy2 + 130), fill=C_SUCCESS_LIGHT, outline="#A7F3D0", radius=10, width=1)
    draw.text((b1_x + 28, sy2 + 12), "(2) 시스템이 자동 채우는 것 (Auto)", font=f_sec_title, fill=C_SUCCESS)
    draw.text((b1_x + 28, sy2 + 44), "• 종류 : 한식당, 호텔, 호스텔 등 자동", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b1_x + 28, sy2 + 72), "• 가격대 : 저렴 / 적당 / 비싼 자동 지정", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b1_x + 44, sy2 + 98), "(사용자 입력 불필요 -> 시스템 자동 매핑)", font=f_loop_desc, fill=C_TEXT_MUTED)

    # Bottom status
    draw.text((b1_x + 24, box_y + box_h - 40), "-> 접수 완료 즉시 택시 블록으로 연계", font=f_body_bold, fill=C_PRIMARY)

    # -------------------------------------------------------------------------
    # [CONNECTOR & CARRY-OVER BADGE] Block 1 -> Block 2
    # -------------------------------------------------------------------------
    arrow_mid_y = box_y + 190
    draw_arrow(b1_x + box_w, arrow_mid_y, b2_x, arrow_mid_y, color=C_ACCENT, line_width=5, arrow_size=15)

    # Carry-over Highlight Badge
    badge_w, badge_h = 100, 85
    badge_x = (b1_x + box_w + b2_x) // 2 - badge_w // 2
    badge_y = arrow_mid_y - badge_h // 2
    draw_card((badge_x, badge_y, badge_x + badge_w, badge_y + badge_h), fill=C_ACCENT_LIGHT, outline=C_ACCENT, radius=10, width=2)
    draw.text((badge_x + 12, badge_y + 10), "[핵심 이월]", font=f_badge_title, fill="#92400E")
    draw.text((badge_x + 10, badge_y + 36), "장소 이름", font=f_badge_text, fill=C_TEXT_MAIN)
    draw.text((badge_x + 36, badge_y + 50), "|| (자동)", font=f_badge_text, fill=C_ACCENT)
    draw.text((badge_x + 10, badge_y + 64), "택시 도착지", font=f_badge_text, fill=C_PRIMARY)

    # -------------------------------------------------------------------------
    # [BLOCK 2] 택시 배차 블록
    # -------------------------------------------------------------------------
    draw_card((b2_x, box_y, b2_x + box_w, box_y + box_h), fill=C_WHITE, outline=C_PRIMARY, radius=14, width=3)
    draw.rounded_rectangle((b2_x, box_y, b2_x + box_w, box_y + 55), radius=14, fill=C_PRIMARY)
    draw.rectangle((b2_x, box_y + 35, b2_x + box_w, box_y + 55), fill=C_PRIMARY)
    draw.text((b2_x + 20, box_y + 14), "[2단계] 택시 배차 블록", font=f_box_header, fill=C_WHITE)

    # Section 2-A: 이월 데이터 & 수정 가능
    sy = box_y + 70
    draw_card((b2_x + 16, sy, b2_x + box_w - 16, sy + 100), fill=C_ACCENT_LIGHT, outline="#FDE68A", radius=10, width=1)
    draw.text((b2_x + 28, sy + 12), "(1) 자동 이월된 슬롯 (수정 가능)", font=f_sec_title, fill="#B45309")
    draw.text((b2_x + 28, sy + 44), "• 도착지 = [1단계 장소 이름]", font=f_body_bold, fill=C_TEXT_MAIN)
    draw.text((b2_x + 44, sy + 70), "(이월값 유지 또는 사용자가 직접 수정 가능)", font=f_loop_desc, fill=C_TEXT_MUTED)

    # Section 2-B: 묻는 것 (User Input)
    sy2 = sy + 115
    draw_card((b2_x + 16, sy2, b2_x + box_w - 16, sy2 + 160), fill="#F8FAFC", outline="#E2E8F0", radius=10, width=1)
    draw.text((b2_x + 28, sy2 + 12), "(2) 사용자에게 묻는 것 (Input)", font=f_sec_title, fill="#1E40AF")
    draw.text((b2_x + 28, sy2 + 42), "• 출발지 : 탑승 위치 (예: 호텔 파크, 서울역)", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b2_x + 28, sy2 + 70), "• 출발 시간 : 희망 시간 (예: 14:30, 지금 바로)", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b2_x + 28, sy2 + 98), "• 택시 종류 : 일반 / 모범 / 고급 / 무관", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b2_x + 44, sy2 + 126), "(미입력 시 기본 일반 택시 배차)", font=f_loop_desc, fill=C_TEXT_MUTED)

    # Bottom status
    draw.text((b2_x + 24, box_y + box_h - 40), "-> 모든 슬롯 충족 시 최종 확정 및 저장", font=f_body_bold, fill=C_PRIMARY)

    # -------------------------------------------------------------------------
    # [CONNECTOR] Block 2 -> Block 3
    # -------------------------------------------------------------------------
    draw_arrow(b2_x + box_w, arrow_mid_y, b3_x, arrow_mid_y, color=C_SUCCESS, line_width=5, arrow_size=15)

    # -------------------------------------------------------------------------
    # [BLOCK 3] 배차 확정 & 저장 블록
    # -------------------------------------------------------------------------
    draw_card((b3_x, box_y, b3_x + box_w, box_y + box_h), fill=C_WHITE, outline=C_SUCCESS, radius=14, width=3)
    draw.rounded_rectangle((b3_x, box_y, b3_x + box_w, box_y + 55), radius=14, fill=C_SUCCESS)
    draw.rectangle((b3_x, box_y + 35, b3_x + box_w, box_y + 55), fill=C_SUCCESS)
    draw.text((b3_x + 20, box_y + 14), "[3단계] 배차 확정 & DB 저장", font=f_box_header, fill=C_WHITE)

    # Section 3-A: 시스템 자동 발급
    sy = box_y + 70
    draw_card((b3_x + 16, sy, b3_x + box_w - 16, sy + 130), fill=C_SUCCESS_LIGHT, outline="#A7F3D0", radius=10, width=1)
    draw.text((b3_x + 28, sy + 12), "(1) 시스템 자동 발급", font=f_sec_title, fill=C_SUCCESS)
    draw.text((b3_x + 28, sy + 44), "• 배차 번호 : TX-XXXXX 고유 코드", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b3_x + 28, sy + 72), "• 기사 연락처 : 010-8376-XXXX 자동 배정", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b3_x + 28, sy + 100), "• 전체 요약 : 장소 + 택시 전체 경로 확인", font=f_body, fill=C_TEXT_MAIN)

    # Section 3-B: Supabase DB 저장
    sy2 = sy + 145
    draw_card((b3_x + 16, sy2, b3_x + box_w - 16, sy2 + 130), fill=C_PRIMARY_LIGHT, outline="#BFDBFE", radius=10, width=1)
    draw.text((b3_x + 28, sy2 + 12), "(2) Supabase DB 실시간 저장", font=f_sec_title, fill=C_PRIMARY)
    draw.text((b3_x + 28, sy2 + 44), "• places 테이블 : 장소 정보 upsert", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b3_x + 28, sy2 + 72), "• taxi_reservations : 예약 내역 insert", font=f_body, fill=C_TEXT_MAIN)
    draw.text((b3_x + 44, sy2 + 98), "(웹 폼 및 챗봇 접수 실시간 동기화 완료)", font=f_loop_desc, fill=C_TEXT_MUTED)

    draw.text((b3_x + 24, box_y + box_h - 40), "-> 배차 완료 티켓 발행 및 사용자 안내", font=f_body_bold, fill=C_SUCCESS)

    # =========================================================================
    # 3. Modification & Feedback Loops (3단 수정 복귀 구조)
    # =========================================================================
    loop_y = 610
    loop_h = 310
    draw_card((60, loop_y, W - 60, loop_y + loop_h), fill="#FFFFFF", outline="#CBD5E1", radius=14, width=2)

    draw.text((85, loop_y + 18), "[수정 정책] 3가지 수정(장소 / 택시 / 둘 다) 복귀 위치 및 동작 루프", font=f_box_header, fill=C_TEXT_MAIN)

    # Loop Card 1: 장소 수정
    lc1_x = 85
    lc1_w = 445
    draw_card((lc1_x, loop_y + 55, lc1_x + lc1_w, loop_y + 285), fill=C_ACCENT_LIGHT, outline=C_ACCENT, radius=12, width=2)
    draw.text((lc1_x + 18, loop_y + 70), "수정 [1] 장소 수정 (장소만 바꿀 때)", font=f_loop_title, fill="#92400E")
    draw.text((lc1_x + 18, loop_y + 105), "• 복귀 위치 : [1단계 장소 접수 블록]으로 복귀", font=f_body_bold, fill=C_TEXT_MAIN)
    draw.text((lc1_x + 18, loop_y + 138), "• 핵심 동작 : 장소 변경 시 2단계 택시 도착지도", font=f_body, fill=C_TEXT_MAIN)
    draw.text((lc1_x + 18, loop_y + 164), "  새로운 장소명으로 자동 재이월 동기화!", font=f_body_bold, fill=C_ACCENT)
    draw.text((lc1_x + 18, loop_y + 200), "• UI 조작 : ['장소 블록 수정'] 버튼 클릭", font=f_loop_desc, fill=C_TEXT_MUTED)
    draw.text((lc1_x + 18, loop_y + 225), "• 챗봇 발화 : \"도착지를 창덕궁으로 바꿔줘\"", font=f_loop_desc, fill=C_TEXT_MUTED)
    draw.text((lc1_x + 18, loop_y + 252), "-> [1단계 복귀 -> 2단계 도착지 자동 갱신]", font=f_body_bold, fill="#92400E")

    # Loop Card 2: 택시 수정
    lc2_x = 575
    lc2_w = 445
    draw_card((lc2_x, loop_y + 55, lc2_x + lc2_w, loop_y + 285), fill=C_PRIMARY_LIGHT, outline=C_PRIMARY, radius=12, width=2)
    draw.text((lc2_x + 18, loop_y + 70), "수정 [2] 택시 수정 (출발지/시간만 바꿀 때)", font=f_loop_title, fill=C_PRIMARY)
    draw.text((lc2_x + 18, loop_y + 105), "• 복귀 위치 : [2단계 택시 배차 블록]으로 복귀", font=f_body_bold, fill=C_TEXT_MAIN)
    draw.text((lc2_x + 18, loop_y + 138), "• 핵심 동작 : 장소(도착지)는 유지한 채,", font=f_body, fill=C_TEXT_MAIN)
    draw.text((lc2_x + 18, loop_y + 164), "  출발지, 시간, 택시 종류만 부분 갱신", font=f_body_bold, fill=C_PRIMARY)
    draw.text((lc2_x + 18, loop_y + 200), "• UI 조작 : ['택시 슬롯 다시 수정'] 버튼 클릭", font=f_loop_desc, fill=C_TEXT_MUTED)
    draw.text((lc2_x + 18, loop_y + 225), "• 챗봇 발화 : \"출발지 서울역으로, 시간 16시\"", font=f_loop_desc, fill=C_TEXT_MUTED)
    draw.text((lc2_x + 18, loop_y + 252), "-> [2단계 복귀 -> 해당 슬롯만 선택 수정]", font=f_body_bold, fill=C_PRIMARY)

    # Loop Card 3: 둘 다 수정 / 처음부터 다시
    lc3_x = 1065
    lc3_w = 445
    draw_card((lc3_x, loop_y + 55, lc3_x + lc3_w, loop_y + 285), fill=C_PURPLE_LIGHT, outline=C_PURPLE, radius=12, width=2)
    draw.text((lc3_x + 18, loop_y + 70), "수정 [3] 둘 다 수정 / 처음부터 다시", font=f_loop_title, fill=C_PURPLE)
    draw.text((lc3_x + 18, loop_y + 105), "• 복귀 위치 : [1단계 장소 접수]로 완전 리셋", font=f_body_bold, fill=C_TEXT_MAIN)
    draw.text((lc3_x + 18, loop_y + 138), "• 핵심 동작 : 장소 및 택시의 모든 슬롯을 비우고", font=f_body, fill=C_TEXT_MAIN)
    draw.text((lc3_x + 18, loop_y + 164), "  처음부터 신규 예약으로 초기화 진행", font=f_body_bold, fill=C_PURPLE)
    draw.text((lc3_x + 18, loop_y + 200), "• UI 조작 : ['처음부터 새 예약'] 버튼 클릭", font=f_loop_desc, fill=C_TEXT_MUTED)
    draw.text((lc3_x + 18, loop_y + 225), "• 챗봇 발화 : \"처음부터 다시요. 식당 예약할래\"", font=f_loop_desc, fill=C_TEXT_MUTED)
    draw.text((lc3_x + 18, loop_y + 252), "-> [전체 슬롯 초기화 -> 1단계 새로 시작]", font=f_body_bold, fill=C_PURPLE)

    # Save PNG
    output_path = "c:/dev/0827taxi_child/flow_diagram.png"
    img.save(output_path, "PNG", quality=95)
    print(f"Refined Flow Diagram saved successfully to {output_path}")

if __name__ == "__main__":
    generate_flow_diagram()
