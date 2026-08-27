import os
from PIL import Image, ImageDraw, ImageFont

def generate_minimal_flow_diagram():
    # 1. Canvas Setup
    W, H = 1400, 680
    img = Image.new("RGB", (W, H), "#FAFBFD")
    draw = ImageDraw.Draw(img)

    # 2. Draw Subtle Grid Background
    grid_size = 28
    for x in range(0, W, grid_size):
        draw.line([(x, 0), (x, H)], fill="#F1F5F9", width=1)
    for y in range(0, H, grid_size):
        draw.line([(0, y), (W, y)], fill="#F1F5F9", width=1)

    # 3. Fonts
    font_bold = "C:/Windows/Fonts/malgunbd.ttf"
    font_reg = "C:/Windows/Fonts/malgun.ttf"

    f_top_col = ImageFont.truetype(font_bold, 15)
    f_sec_title = ImageFont.truetype(font_bold, 15)
    f_node_title = ImageFont.truetype(font_bold, 17)
    f_node_sub = ImageFont.truetype(font_reg, 12)
    f_label = ImageFont.truetype(font_bold, 12)
    f_legend = ImageFont.truetype(font_reg, 12)
    f_legend_num = ImageFont.truetype(font_bold, 10)

    # 4. Helper drawing functions
    def draw_dashed_rect(xy, outline="#CBD5E1", width=1, dash=(8, 6)):
        x0, y0, x1, y1 = xy
        # Top & Bottom
        for x in range(x0, x1, dash[0] + dash[1]):
            draw.line([(x, y0), (min(x + dash[0], x1), y0)], fill=outline, width=width)
            draw.line([(x, y1), (min(x + dash[0], x1), y1)], fill=outline, width=width)
        # Left & Right
        for y in range(y0, y1, dash[0] + dash[1]):
            draw.line([(x0, y), (x0, min(y + dash[0], y1))], fill=outline, width=width)
            draw.line([(x1, y), (x1, min(y + dash[0], y1))], fill=outline, width=width)

    def draw_dashed_line(p1, p2, fill="#10B981", width=2, dash=(6, 5)):
        x0, y0 = p1
        x1, y1 = p2
        if y0 == y1: # Horizontal
            step = 1 if x1 > x0 else -1
            length = abs(x1 - x0)
            d = 0
            while d < length:
                seg = min(dash[0], length - d)
                cur_x = x0 + step * d
                draw.line([(cur_x, y0), (cur_x + step * seg, y0)], fill=fill, width=width)
                d += dash[0] + dash[1]
        elif x0 == x1: # Vertical
            step = 1 if y1 > y0 else -1
            length = abs(y1 - y0)
            d = 0
            while d < length:
                seg = min(dash[0], length - d)
                cur_y = y0 + step * d
                draw.line([(x0, cur_y), (x0, cur_y + step * seg)], fill=fill, width=width)
                d += dash[0] + dash[1]

    def draw_node(xy, title, subtitle, fill_color, stroke_color, text_color, sub_color, icon=""):
        x0, y0, x1, y1 = xy
        # Draw node box with rounded corners
        draw.rounded_rectangle((x0, y0, x1, y1), radius=12, fill=fill_color, outline=stroke_color, width=2)
        
        cx = (x0 + x1) // 2
        cy = (y0 + y1) // 2

        # Text measurement & centering
        t_box = draw.textbbox((0, 0), title, font=f_node_title)
        s_box = draw.textbbox((0, 0), subtitle, font=f_node_sub)
        
        tw, th = t_box[2] - t_box[0], t_box[3] - t_box[1]
        sw, sh = s_box[2] - s_box[0], s_box[3] - s_box[1]

        draw.text((cx - tw // 2, cy - 16), title, font=f_node_title, fill=text_color)
        draw.text((cx - sw // 2, cy + 8), subtitle, font=f_node_sub, fill=sub_color)

    def draw_arrow_head(tip, direction="right", color="#10B981", size=9):
        x, y = tip
        if direction == "right":
            draw.polygon([(x, y), (x - size, y - int(size * 0.6)), (x - size, y + int(size * 0.6))], fill=color)
        elif direction == "up":
            draw.polygon([(x, y), (x - int(size * 0.6), y + size), (x + int(size * 0.6), y + size)], fill=color)
        elif direction == "left":
            draw.polygon([(x, y), (x + size, y - int(size * 0.6)), (x + size, y + int(size * 0.6))], fill=color)

    # =========================================================================
    # 5. Top Column Titles
    # =========================================================================
    draw.text((270, 30), "장소 블록", font=f_top_col, fill="#334155")
    draw.text((680, 30), "택시 블록", font=f_top_col, fill="#047857")
    draw.text((1060, 30), "완료", font=f_top_col, fill="#334155")

    # =========================================================================
    # 6. Section 01 : 서비스 흐름 (Container & Nodes)
    # =========================================================================
    s1_x0, s1_y0, s1_x1, s1_y1 = 60, 65, 1340, 290
    draw_dashed_rect((s1_x0, s1_y0, s1_x1, s1_y1), outline="#94A3B8", width=1)
    draw.text((s1_x0 + 20, s1_y0 + 16), "01  /  서비스 흐름", font=f_sec_title, fill="#475569")

    # Node positions (y: 130 ~ 230, h: 100, w: 100)
    ny0, ny1 = 135, 235
    node_w = 100

    # Node 1: 장소
    n1_x0 = 120
    n1_x1 = n1_x0 + node_w
    draw_node((n1_x0, ny0, n1_x1, ny1), "장소", "조건·이름", "#E0F2FE", "#0284C7", "#0369A1", "#0284C7")

    # Node 2: 저장 (places)
    n2_x0 = 380
    n2_x1 = n2_x0 + node_w
    draw_node((n2_x0, ny0, n2_x1, ny1), "저장", "places", "#F3E8FF", "#A855F7", "#6B21A8", "#7E22CE")

    # Node 3: 택시 (도착 이월)
    n3_x0 = 640
    n3_x1 = n3_x0 + node_w
    draw_node((n3_x0, ny0, n3_x1, ny1), "택시", "도착 이월", "#ECFDF5", "#10B981", "#047857", "#059669")

    # Node 4: 저장 (dispatch)
    n4_x0 = 900
    n4_x1 = n4_x0 + node_w
    draw_node((n4_x0, ny0, n4_x1, ny1), "저장", "dispatch", "#F3E8FF", "#A855F7", "#6B21A8", "#7E22CE")

    # Node 5: 완료 (번호 발급)
    n5_x0 = 1150
    n5_x1 = n5_x0 + node_w
    draw_node((n5_x0, ny0, n5_x1, ny1), "완료", "번호 발급", "#FEF3C7", "#F59E0B", "#B45309", "#D97706")

    # Arrows in Section 01
    mid_y = (ny0 + ny1) // 2

    # n1 -> n2
    draw_dashed_line((n1_x1, mid_y), (n2_x0, mid_y), fill="#059669", width=2)
    draw_arrow_head((n2_x0, mid_y), "right", color="#059669")

    # n2 -> n3 (with "이월" badge label)
    draw_dashed_line((n2_x1, mid_y), (n3_x0, mid_y), fill="#059669", width=3)
    draw_arrow_head((n3_x0, mid_y), "right", color="#059669")
    # Label "이월"
    draw.text(((n2_x1 + n3_x0) // 2 - 12, mid_y - 24), "이월", font=f_label, fill="#059669")

    # n3 -> n4
    draw_dashed_line((n3_x1, mid_y), (n4_x0, mid_y), fill="#059669", width=2)
    draw_arrow_head((n4_x0, mid_y), "right", color="#059669")

    # n4 -> n5
    draw_dashed_line((n4_x1, mid_y), (n5_x0, mid_y), fill="#059669", width=2)
    draw_arrow_head((n5_x0, mid_y), "right", color="#059669")

    # =========================================================================
    # 7. Section 02 : 수정 (Container & Return Flow)
    # =========================================================================
    s2_x0, s2_y0, s2_x1, s2_y1 = 60, 320, 1340, 540
    draw_dashed_rect((s2_x0, s2_y0, s2_x1, s2_y1), outline="#94A3B8", width=1)
    draw.text((s2_x0 + 20, s2_y0 + 16), "02  /  수정", font=f_sec_title, fill="#475569")

    # Mod Node 1: 장소 (이름 변경)
    mny0, mny1 = 380, 480
    mn1_x0 = 120
    mn1_x1 = mn1_x0 + node_w
    draw_node((mn1_x0, mny0, mn1_x1, mny1), "장소↓", "이름 변경", "#1E293B", "#334155", "#F8FAFC", "#94A3B8")

    # Mod Node 2: 택시 (시간 변경)
    mn2_x0 = 900
    mn2_x1 = mn2_x0 + node_w
    draw_node((mn2_x0, mny0, mn2_x1, mny1), "택시↓", "시간 변경", "#1E293B", "#334155", "#F8FAFC", "#94A3B8")

    # Return Flow 1: 장소 이름 변경 -> 장소 (다시)
    draw_dashed_line((170, mny0), (170, ny1), fill="#8B5CF6", width=2)
    draw_arrow_head((170, ny1), "up", color="#8B5CF6")
    draw.text((158, (mny0 + ny1) // 2 - 8), "다시", font=f_label, fill="#7C3AED")

    # Return Flow 2: 장소 이름 변경 -> 택시 도착지 연쇄 (도착지 연쇄)
    # Line goes: from mn1 (top right) -> horizontal to x=670 -> vertical up to n3
    draw_dashed_line((220, 360), (670, 360), fill="#8B5CF6", width=2)
    draw_dashed_line((220, mny0 + 20), (220, 360), fill="#8B5CF6", width=2)
    draw_dashed_line((670, 360), (670, ny1), fill="#8B5CF6", width=2)
    draw_arrow_head((670, ny1), "up", color="#8B5CF6")
    draw.text((370, 338), "도착지 연쇄", font=f_label, fill="#7C3AED")

    # Return Flow 3: 택시 시간 변경 -> 택시 블록으로 복귀
    draw_dashed_line((950, mny0), (950, 360), fill="#8B5CF6", width=2)
    draw_dashed_line((950, 360), (710, 360), fill="#8B5CF6", width=2)
    draw_dashed_line((710, 360), (710, ny1), fill="#8B5CF6", width=2)
    draw_arrow_head((710, ny1), "up", color="#8B5CF6")

    # =========================================================================
    # 8. Legend (Bottom)
    # =========================================================================
    leg_y = 590
    draw.text((60, leg_y), "Legend", font=f_node_title, fill="#0F172A")

    items = [
        ("User UI", "1", "#E0F2FE", "#0284C7", "#0369A1"),
        ("Agent logic", "1", "#ECFDF5", "#10B981", "#047857"),
        ("Context / trace", "2", "#F3E8FF", "#A855F7", "#6B21A8"),
        ("Cloud service", "1", "#FEF3C7", "#F59E0B", "#B45309"),
        ("External system", "2", "#F1F5F9", "#94A3B8", "#475569")
    ]

    cur_x = 160
    for name, num, fill_c, stroke_c, text_c in items:
        # Pill box
        pw = 140 if len(name) > 10 else 115
        draw.rounded_rectangle((cur_x, leg_y - 2, cur_x + pw, leg_y + 24), radius=6, fill=fill_c, outline=stroke_c, width=1)
        draw.text((cur_x + 8, leg_y + 3), name, font=f_legend, fill=text_c)
        # Small circle number
        circle_x = cur_x + pw - 18
        draw.ellipse((circle_x, leg_y + 4, circle_x + 12, leg_y + 16), fill="#FFFFFF", outline=stroke_c, width=1)
        draw.text((circle_x + 3, leg_y + 3), num, font=f_legend_num, fill=text_c)
        cur_x += pw + 18

    # Save PNG
    output_path = "c:/dev/0827taxi_child/flow_diagram.png"
    img.save(output_path, "PNG", quality=95)
    print(f"Minimal Flow Diagram saved successfully to {output_path}")

if __name__ == "__main__":
    generate_minimal_flow_diagram()
