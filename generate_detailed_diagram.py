import os
import math
from PIL import Image, ImageDraw, ImageFont

# Set canvas dimensions (High Resolution)
W, H = 1680, 1100
img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
draw = ImageDraw.Draw(img)

# Load Windows native Korean fonts
def get_font(size, bold=False):
    font_path = "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/gulim.ttc"
    return ImageFont.truetype(font_path, size)

font_title = get_font(28, bold=True)
font_subtitle = get_font(15, bold=False)
font_header_tag = get_font(17, bold=True)
font_node_title = get_font(16, bold=True)
font_node_sub = get_font(13, bold=False)
font_legend_sub = get_font(14, bold=False)
font_badge = get_font(12, bold=True)
font_arrow = get_font(12, bold=True)

# Color System
COLOR_USER_BOX = (255, 243, 205)       # Light Yellow (User Input)
COLOR_SYSTEM_BOX = (220, 245, 225)     # Light Green (System Auto Input)
COLOR_MODIFY_BORDER = (0, 70, 240)      # Solid Blue (Modifiable outline)
COLOR_NORMAL_BORDER = (160, 205, 170)  # Subtle Green outline
COLOR_TEXT_MAIN = (15, 23, 42)
COLOR_TEXT_MUTED = (71, 85, 105)

# Background Grid
for x in range(0, W, 40):
    draw.line([(x, 0), (x, H)], fill=(245, 248, 251), width=1)
for y in range(0, H, 40):
    draw.line([(0, y), (W, y)], fill=(245, 248, 251), width=1)

# 1. Header & Title
draw.text((60, 35), "택시 배차 및 장소 연계 서비스 상세 구조도 (Flow-Diagram)", fill=(15, 23, 42), font=font_title)
draw.text((60, 75), "Actors [User(사용자), Callcenter(AI/상담원), System DB(플랫폼)] 간 데이터 흐름 및 수정 루프", fill=COLOR_TEXT_MUTED, font=font_subtitle)

# 2. Top Legend Box
legend_y = 42
legend_start_x = 940

# Legend 1: 사용자 입력
draw.rectangle([legend_start_x, legend_y, legend_start_x + 28, legend_y + 18], fill=COLOR_USER_BOX, outline=COLOR_MODIFY_BORDER, width=2)
draw.text((legend_start_x + 36, legend_y + 1), "사용자 입력", fill=COLOR_TEXT_MAIN, font=font_legend_sub)

# Legend 2: 시스템 자동 입력
draw.rectangle([legend_start_x + 150, legend_y, legend_start_x + 178, legend_y + 18], fill=COLOR_SYSTEM_BOX, outline=(140, 185, 140), width=1)
draw.text((legend_start_x + 186, legend_y + 1), "시스템 자동 입력 / 표출", fill=COLOR_TEXT_MAIN, font=font_legend_sub)

# Legend 3: 수정 가능 (파란 테두리)
draw.line([(legend_start_x + 400, legend_y + 9), (legend_start_x + 440, legend_y + 9)], fill=COLOR_MODIFY_BORDER, width=3)
draw.text((legend_start_x + 450, legend_y + 1), "수정 가능 (파란 테두리)", fill=COLOR_MODIFY_BORDER, font=font_legend_sub)

# Card Drawing Helper
def draw_card(x, y, w, h, title, subtitle, is_user=True, is_modifiable=True, actor_tag="User", step_no=None):
    bg_color = COLOR_USER_BOX if is_user else COLOR_SYSTEM_BOX
    border_color = COLOR_MODIFY_BORDER if is_modifiable else (130, 185, 140)
    border_w = 2 if is_modifiable else 1

    # Base rounded rect
    draw.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=bg_color, outline=border_color, width=border_w)

    # Actor Tag Badge
    badge_bg = (37, 99, 235) if actor_tag == "User" else ((16, 185, 129) if actor_tag == "Callcenter" else (124, 58, 237))
    bbox_tag = font_badge.getbbox(actor_tag)
    tag_w = bbox_tag[2] - bbox_tag[0] + 16
    draw.rounded_rectangle([x + 10, y + 10, x + 10 + tag_w, y + 28], radius=4, fill=badge_bg)
    draw.text((x + 18, y + 12), actor_tag, fill=(255, 255, 255), font=font_badge)

    # Step Number Badge
    if step_no:
        draw.rounded_rectangle([x + w - 34, y + 10, x + w - 10, y + 28], radius=4, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
        draw.text((x + w - 26, y + 12), str(step_no), fill=(51, 65, 85), font=font_badge)

    # Titles
    draw.text((x + 14, y + 38), title, fill=COLOR_TEXT_MAIN, font=font_node_title)
    if subtitle:
        draw.text((x + 14, y + 66), subtitle, fill=COLOR_TEXT_MUTED, font=font_node_sub)

# Arrow Drawing Helper
def draw_arrow(p1, p2, color=(71, 85, 105), width=2, label=None, label_offset=(0, 0), dashed=False):
    x1, y1 = p1
    x2, y2 = p2
    
    if dashed:
        dist = math.hypot(x2 - x1, y2 - y1)
        steps = max(int(dist / 12), 2)
        for i in range(0, steps, 2):
            t1 = i / steps
            t2 = min((i + 1) / steps, 1.0)
            draw.line([(x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1), (x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2)], fill=color, width=width)
    else:
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)
        
    angle = math.atan2(y2 - y1, x2 - x1)
    arrow_len = 9
    arrow_angle = math.pi / 6
    x_tip1 = x2 - arrow_len * math.cos(angle - arrow_angle)
    y_tip1 = y2 - arrow_len * math.sin(angle - arrow_angle)
    x_tip2 = x2 - arrow_len * math.cos(angle + arrow_angle)
    y_tip2 = y2 - arrow_len * math.sin(angle + arrow_angle)
    draw.polygon([(x2, y2), (x_tip1, y_tip1), (x_tip2, y_tip2)], fill=color)

    if label:
        lx = (x1 + x2) / 2 + label_offset[0]
        ly = (y1 + y2) / 2 + label_offset[1]
        bbox = font_arrow.getbbox(label)
        bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.rounded_rectangle([lx - 6, ly - 3, lx + bw + 6, ly + bh + 3], radius=4, fill=(255, 255, 255), outline=(203, 213, 225), width=1)
        draw.text((lx, ly), label, fill=color, font=font_arrow)

# -------------------------------------------------------------
# 3. BLOCK 1: 장소블록 (Place Block)
# -------------------------------------------------------------
block1_x, block1_y, block1_w, block1_h = 60, 130, 1560, 360
draw.rounded_rectangle([block1_x, block1_y, block1_x + block1_w, block1_y + block1_h], radius=12, fill=(255, 255, 255), outline=(148, 163, 184), width=1)

# Block 1 Header Tag
draw.rounded_rectangle([block1_x + 24, block1_y - 15, block1_x + 180, block1_y + 15], radius=6, fill=(30, 58, 138))
draw.text((block1_x + 36, block1_y - 11), "장소블록 (Place)", fill=(255, 255, 255), font=font_header_tag)

# Place Block Nodes
c1_x, c1_y = 100, 180
card_w, card_h = 260, 105

# 1. 장소 도메인 입력
draw_card(c1_x, c1_y, card_w, card_h, "장소 도메인 입력", "(방문 목적: 식당/숙소/관광)", is_user=True, is_modifiable=True, actor_tag="User", step_no=1)

# 2. 장소명 입력
c2_x = c1_x + card_w + 100
draw_card(c2_x, c1_y, card_w, card_h, "장소명 입력", "(예: 두부두부두부, 심미 호스텔)", is_user=True, is_modifiable=True, actor_tag="User", step_no=2)

# 3. 콜센터/AI 장소 해석 및 조회
c3_x = c2_x + card_w + 100
draw_card(c3_x, c1_y, card_w, card_h, "장소 해석 및 조회", "(도메인 자동 추론 & DB 매칭)", is_user=False, is_modifiable=False, actor_tag="Callcenter", step_no=3)

# 4. 장소 세부 정보 표출
c4_x = c3_x + card_w + 100
draw_card(c4_x, c1_y, card_w + 40, card_h, "장소 세부 정보 표출", "(장소지역, 가격대, 태그 자동 출력)", is_user=False, is_modifiable=False, actor_tag="System DB", step_no=4)

# Block 1 Internal Arrows
draw_arrow((c1_x + card_w, c1_y + 52), (c2_x, c1_y + 52), label="도메인 선택", label_offset=(-35, -24))
draw_arrow((c2_x + card_w, c1_y + 52), (c3_x, c1_y + 52), label="장소명 전달", label_offset=(-35, -24))
draw_arrow((c3_x + card_w, c1_y + 52), (c4_x, c1_y + 52), label="DB 조회 결과", label_offset=(-38, -24))

# Modification Return Loop inside Place Block
m_loop_y = c1_y + card_h + 35
draw.line([(c2_x + card_w/2, c1_y + card_h), (c2_x + card_w/2, m_loop_y)], fill=(37, 99, 235), width=2)
draw.line([(c2_x + card_w/2, m_loop_y), (c1_x + card_w/2, m_loop_y)], fill=(37, 99, 235), width=2)
draw_arrow((c1_x + card_w/2, m_loop_y), (c1_x + card_w/2, c1_y + card_h), color=(37, 99, 235), label="[수정] 장소명 변경 시 도메인 재설정", label_offset=(-90, -18))

# -------------------------------------------------------------
# 4. BLOCK 2: 택시블록 (Taxi Block)
# -------------------------------------------------------------
block2_x, block2_y, block2_w, block2_h = 60, 540, 1560, 480
draw.rounded_rectangle([block2_x, block2_y, block2_x + block2_w, block2_y + block2_h], radius=12, fill=(255, 255, 255), outline=(148, 163, 184), width=1)

# Block 2 Header Tag
draw.rounded_rectangle([block2_x + 24, block2_y - 15, block2_x + 180, block2_y + 15], radius=6, fill=(16, 185, 129))
draw.text((block2_x + 40, block2_y - 11), "택시블록 (Taxi)", fill=(255, 255, 255), font=font_header_tag)

# Taxi Block Nodes
t1_x, t1_y = 100, 595
t_card_w, t_card_h = 240, 100

# 5. 출발위치 입력
draw_card(t1_x, t1_y, t_card_w, t_card_h, "출발위치 입력", "(예: 호텔 파크, 서울역)", is_user=True, is_modifiable=True, actor_tag="User", step_no=5)

# 6. 도착위치 자동 설정 (= 장소명 자동 이월)
t2_x = t1_x + t_card_w + 70
draw_card(t2_x, t1_y, t_card_w, t_card_h, "도착위치 자동 설정", "(= 장소명에서 자동 이월)", is_user=False, is_modifiable=True, actor_tag="Callcenter", step_no=6)

# 7. 출발시간 입력
t3_x = t2_x + t_card_w + 70
draw_card(t3_x, t1_y, t_card_w, t_card_h, "출발시간 입력", "(예: 14:30 / 지금 바로)", is_user=True, is_modifiable=True, actor_tag="User", step_no=7)

# 8. 택시 종류 입력
t4_x = t3_x + t_card_w + 70
draw_card(t4_x, t1_y, t_card_w, t_card_h, "택시 종류 입력", "(일반/모범/고급/대형/무관)", is_user=True, is_modifiable=True, actor_tag="User", step_no=8)

# 9. 최종 배차 예약 정보 표출 (완료 티켓)
t5_x = t2_x
t5_y = 765
t5_w = 760
t5_h = 110
draw.rounded_rectangle([t5_x, t5_y, t5_x + t5_w, t5_y + t5_h], radius=10, fill=COLOR_SYSTEM_BOX, outline=(16, 185, 129), width=2)

# Tag Badge on Completion Box
draw.rounded_rectangle([t5_x + 14, t5_y + 12, t5_x + 130, t5_y + 30], radius=4, fill=(16, 185, 129))
draw.text((t5_x + 22, t5_y + 14), "Callcenter & DB", fill=(255, 255, 255), font=font_badge)
draw.rounded_rectangle([t5_x + t5_w - 38, t5_y + 12, t5_x + t5_w - 14, t5_y + 30], radius=4, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
draw.text((t5_x + t5_w - 30, t5_y + 14), "9", fill=(51, 65, 85), font=font_badge)

draw.text((t5_x + 14, t5_y + 40), "배차 예약 정보 최종 표출 (배차 완료)", fill=(6, 95, 70), font=font_node_title)
draw.text((t5_x + 14, t5_y + 64), "• 예약번호 발급 (TX-93806)   • 배정 기사님 연락처 (010-8376-2540)   • Supabase 실시간 저장", fill=COLOR_TEXT_MAIN, font=font_subtitle)
draw.text((t5_x + 14, t5_y + 86), "• 연계 경로: 출발지(호텔 파크) -> 도착지[이월](두부두부두부) / 14:30 일반 택시", fill=COLOR_TEXT_MUTED, font=font_node_sub)

# Block 2 Internal Horizontal Arrows
draw_arrow((t1_x + t_card_w, t1_y + 50), (t2_x, t1_y + 50), label="출발지 확정", label_offset=(-35, -24))
draw_arrow((t2_x + t_card_w, t1_y + 50), (t3_x, t1_y + 50), label="도착지 자동연계", label_offset=(-45, -24))
draw_arrow((t3_x + t_card_w, t1_y + 50), (t4_x, t1_y + 50), label="시간 확정", label_offset=(-30, -24))

# Arrow from Taxi Type down to Final Completion
draw.line([(t4_x + t_card_w/2, t1_y + t_card_h), (t4_x + t_card_w/2, t5_y + 55)], fill=(16, 185, 129), width=2)
draw_arrow((t4_x + t_card_w/2, t5_y + 55), (t5_x + t5_w, t5_y + 55), color=(16, 185, 129), label="4대 슬롯 완비 -> 배차 확정", label_offset=(-80, -18))

# -------------------------------------------------------------
# 5. CORE INTER-BLOCK CARRY-OVER ARROW (장소명 -> 택시 도착지 자동 이월)
# -------------------------------------------------------------
carry_start_x = c2_x + card_w/2 + 25
carry_start_y = c1_y + card_h
carry_end_x = t2_x + t_card_w/2
carry_end_y = t1_y

draw.line([(carry_start_x, carry_start_y), (carry_start_x, carry_start_y + 115)], fill=(124, 58, 237), width=3)
draw.line([(carry_start_x, carry_start_y + 115), (carry_end_x, carry_start_y + 115)], fill=(124, 58, 237), width=3)
draw_arrow((carry_end_x, carry_start_y + 115), (carry_end_x, carry_end_y), color=(124, 58, 237), width=3, label="[핵심 이월] 장소명 -> 택시 도착지로 자동 연계", label_offset=(-125, -20))

# -------------------------------------------------------------
# 6. MODIFICATION RECOVERY LOOPS (수정 발생 시 흐름)
# -------------------------------------------------------------
# Taxi slot modification loop (시간/차종/출발지 수정)
draw.line([(t3_x + t_card_w/2, t1_y + t_card_h), (t3_x + t_card_w/2, t1_y + t_card_h + 30)], fill=(37, 99, 235), width=2)
draw.line([(t3_x + t_card_w/2, t1_y + t_card_h + 30), (t1_x + t_card_w/2, t1_y + t_card_h + 30)], fill=(37, 99, 235), width=2)
draw_arrow((t1_x + t_card_w/2, t1_y + t_card_h + 30), (t1_x + t_card_w/2, t1_y + t_card_h), color=(37, 99, 235), label="[수정] 출발지/시간/차종 변경 시 해당 슬롯만 갱신", label_offset=(-70, 8), dashed=True)

# -------------------------------------------------------------
# 7. Bottom Actor Description Summary Bar
# -------------------------------------------------------------
bottom_bar_y = 900
draw.rounded_rectangle([block2_x + 30, bottom_bar_y, block2_x + block2_w - 30, bottom_bar_y + 65], radius=8, fill=(241, 245, 249), outline=(203, 213, 225), width=1)
draw.text((block2_x + 50, bottom_bar_y + 12), "• User (사용자):", fill=(30, 58, 138), font=font_node_title)
draw.text((block2_x + 185, bottom_bar_y + 14), "장소 도메인/이름 선택, 출발지/시간/차종 입력 및 대화 중 자유로운 실시간 수정 요청", fill=COLOR_TEXT_MAIN, font=font_subtitle)
draw.text((block2_x + 50, bottom_bar_y + 36), "• Callcenter (AI/상담원):", fill=(6, 95, 70), font=font_node_title)
draw.text((block2_x + 245, bottom_bar_y + 38), "장소명을 택시 도착지로 자동 이월, 부족한 슬롯 능동 질의, Supabase DB 실시간 저장 & 티켓 발급", fill=COLOR_TEXT_MAIN, font=font_subtitle)

# Save high-res PNG
output_path = "c:/dev/0827taxi_child/detailed_service_flow.png"
img.save(output_path, "PNG", dpi=(300, 300))
print(f"Refined detailed diagram successfully saved to {output_path}")
