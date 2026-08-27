import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def generate_perfect_flow_diagram():
    # 1. Canvas Setup (High resolution 1600 x 760)
    W, H = 1600, 760
    img = Image.new("RGBA", (W, H), (250, 252, 254, 255))
    draw = ImageDraw.Draw(img)

    # 2. Draw Subtle Grid Background
    grid_size = 32
    for x in range(0, W, grid_size):
        draw.line([(x, 0), (x, H)], fill=(241, 245, 249, 255), width=1)
    for y in range(0, H, grid_size):
        draw.line([(0, y), (W, y)], fill=(241, 245, 249, 255), width=1)

    # 3. Fonts
    font_bold = "C:/Windows/Fonts/malgunbd.ttf"
    font_reg = "C:/Windows/Fonts/malgun.ttf"

    f_top_col = ImageFont.truetype(font_bold, 17)
    f_sec_title = ImageFont.truetype(font_bold, 16)
    f_node_title = ImageFont.truetype(font_bold, 20)
    f_node_sub = ImageFont.truetype(font_reg, 13)
    f_label = ImageFont.truetype(font_bold, 13)
    f_legend_title = ImageFont.truetype(font_bold, 16)
    f_legend = ImageFont.truetype(font_reg, 13)
    f_legend_num = ImageFont.truetype(font_bold, 11)

    # 4. Helper for dashed rectangle containers
    def draw_dashed_box(xy, outline=(203, 213, 225, 255), width=1, dash=(9, 7)):
        x0, y0, x1, y1 = xy
        for x in range(x0, x1, dash[0] + dash[1]):
            draw.line([(x, y0), (min(x + dash[0], x1), y0)], fill=outline, width=width)
            draw.line([(x, y1), (min(x + dash[0], x1), y1)], fill=outline, width=width)
        for y in range(y0, y1, dash[0] + dash[1]):
            draw.line([(x0, y), (x0, min(y + dash[0], y1))], fill=outline, width=width)
            draw.line([(x1, y), (x1, min(y + dash[0], y1))], fill=outline, width=width)

    # Helper for dashed lines
    def draw_dashed_line(p1, p2, fill=(16, 185, 129, 255), width=2, dash=(7, 6)):
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

    # Helper for arrowheads
    def draw_arrow_head(tip, direction="right", color=(16, 185, 129, 255), size=10):
        x, y = tip
        if direction == "right":
            draw.polygon([(x, y), (x - size, y - int(size * 0.65)), (x - size, y + int(size * 0.65))], fill=color)
        elif direction == "up":
            draw.polygon([(x, y), (x - int(size * 0.65), y + size), (x + int(size * 0.65), y + size)], fill=color)
        elif direction == "left":
            draw.polygon([(x, y), (x + size, y - int(size * 0.65)), (x + size, y + int(size * 0.65))], fill=color)

    # Helper to draw cute icons
    def draw_icon(icon_type, cx, cy, color):
        if icon_type == "ui": # Window/dialog icon
            draw.rounded_rectangle((cx - 10, cy - 8, cx + 10, cy + 8), radius=3, outline=color, width=2)
            draw.line([(cx - 10, cy - 2), (cx + 10, cy - 2)], fill=color, width=1)
            draw.ellipse((cx - 7, cy - 6, cx - 5, cy - 4), fill=color)
            draw.ellipse((cx - 3, cy - 6, cx - 1, cy - 4), fill=color)
        elif icon_type == "db": # Cylinder/DB icon
            draw.ellipse((cx - 9, cy - 8, cx + 9, cy - 2), outline=color, width=2)
            draw.line([(cx - 9, cy - 5), (cx - 9, cy + 5)], fill=color, width=2)
            draw.line([(cx + 9, cy - 5), (cx + 9, cy + 5)], fill=color, width=2)
            draw.arc((cx - 9, cy + 2, cx + 9, cy + 8), start=0, end=180, fill=color, width=2)
        elif icon_type == "code": # < > code / agent icon
            draw.line([(cx - 4, cy - 6), (cx - 9, cy), (cx - 4, cy + 6)], fill=color, width=2)
            draw.line([(cx + 4, cy - 6), (cx + 9, cy), (cx + 4, cy + 6)], fill=color, width=2)
        elif icon_type == "done": # Badge / complete icon
            draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), outline=color, width=2)
            draw.line([(cx - 4, cy), (cx - 1, cy + 4), (cx + 5, cy - 3)], fill=color, width=2)
        elif icon_type == "edit": # Edit / pencil icon
            draw.line([(cx - 6, cy + 6), (cx + 4, cy - 4)], fill=color, width=2)
            draw.line([(cx + 4, cy - 4), (cx + 7, cy - 1)], fill=color, width=2)
            draw.line([(cx + 7, cy - 1), (cx - 3, cy + 9)], fill=color, width=2)
            draw.line([(cx - 3, cy + 9), (cx - 7, cy + 7)], fill=color, width=2)

    # Helper for node with soft glow / shadows
    def draw_node_card(xy, title, subtitle, fill_c, stroke_c, text_c, sub_c, icon_type):
        x0, y0, x1, y1 = xy

        # Soft drop shadow
        for i in range(4, 0, -1):
            alpha = int(18 - i * 3)
            shadow_c = (stroke_c[0], stroke_c[1], stroke_c[2], alpha)
            draw.rounded_rectangle((x0 - i, y0 - i, x1 + i, y1 + i), radius=16, outline=shadow_c, width=1)

        # Node body
        draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=fill_c, outline=stroke_c, width=2)

        cx = (x0 + x1) // 2
        
        # Icon
        draw_icon(icon_type, cx, y0 + 26, stroke_c)

        # Title
        t_box = draw.textbbox((0, 0), title, font=f_node_title)
        tw = t_box[2] - t_box[0]
        draw.text((cx - tw // 2, y0 + 44), title, font=f_node_title, fill=text_c)

        # Subtitle
        s_box = draw.textbbox((0, 0), subtitle, font=f_node_sub)
        sw = s_box[2] - s_box[0]
        draw.text((cx - sw // 2, y0 + 74), subtitle, font=f_node_sub, fill=sub_c)

    # =========================================================================
    # 5. Top Column Titles
    # =========================================================================
    draw.text((360, 36), "장소 블록", font=f_top_col, fill=(30, 41, 59, 255))
    draw.text((800, 36), "택시 블록", font=f_top_col, fill=(4, 120, 87, 255))
    draw.text((1240, 36), "완료", font=f_top_col, fill=(30, 41, 59, 255))

    # =========================================================================
    # 6. Section 01 : 서비스 흐름 (Container & Nodes)
    # =========================================================================
    s1_x0, s1_y0, s1_x1, s1_y1 = 60, 75, 1540, 320
    draw_dashed_box((s1_x0, s1_y0, s1_x1, s1_y1), outline=(148, 163, 184, 255), width=1)
    draw.text((s1_x0 + 24, s1_y0 + 18), "01  /  서비스 흐름", font=f_sec_title, fill=(71, 85, 105, 255))

    ny0, ny1 = 150, 265
    node_w = 115

    # Node 1: 장소 (조건·이름)
    n1_x0 = 130
    n1_x1 = n1_x0 + node_w
    draw_node_card((n1_x0, ny0, n1_x1, ny1), "장소", "조건·이름", 
                   (224, 242, 254, 255), (2, 132, 199, 255), (3, 105, 161, 255), (2, 132, 199, 255), "ui")

    # Node 2: 저장 (places)
    n2_x0 = 425
    n2_x1 = n2_x0 + node_w
    draw_node_card((n2_x0, ny0, n2_x1, ny1), "저장", "places", 
                   (243, 232, 255, 255), (168, 85, 247, 255), (107, 33, 168, 255), (126, 34, 206, 255), "db")

    # Node 3: 택시 (도착 이월)
    n3_x0 = 720
    n3_x1 = n3_x0 + node_w
    draw_node_card((n3_x0, ny0, n3_x1, ny1), "택시", "도착 이월", 
                   (236, 253, 245, 255), (16, 185, 129, 255), (4, 120, 87, 255), (5, 150, 105, 255), "code")

    # Node 4: 저장 (dispatch)
    n4_x0 = 1015
    n4_x1 = n4_x0 + node_w
    draw_node_card((n4_x0, ny0, n4_x1, ny1), "저장", "dispatch", 
                   (243, 232, 255, 255), (168, 85, 247, 255), (107, 33, 168, 255), (126, 34, 206, 255), "db")

    # Node 5: 완료 (번호 발급)
    n5_x0 = 1300
    n5_x1 = n5_x0 + node_w
    draw_node_card((n5_x0, ny0, n5_x1, ny1), "완료", "번호 발급", 
                   (254, 243, 199, 255), (245, 158, 11, 255), (180, 83, 9, 255), (217, 119, 6, 255), "done")

    # Main Green Arrows
    mid_y = (ny0 + ny1) // 2
    G_COLOR = (5, 150, 105, 255)

    # 1 -> 2
    draw_dashed_line((n1_x1, mid_y), (n2_x0, mid_y), fill=G_COLOR, width=2)
    draw_arrow_head((n2_x0, mid_y), "right", color=G_COLOR, size=11)

    # 2 -> 3 (with 이월 label)
    draw_dashed_line((n2_x1, mid_y), (n3_x0, mid_y), fill=G_COLOR, width=3)
    draw_arrow_head((n3_x0, mid_y), "right", color=G_COLOR, size=11)
    draw.text(((n2_x1 + n3_x0) // 2 - 14, mid_y - 24), "이월", font=f_label, fill=G_COLOR)

    # 3 -> 4
    draw_dashed_line((n3_x1, mid_y), (n4_x0, mid_y), fill=G_COLOR, width=2)
    draw_arrow_head((n4_x0, mid_y), "right", color=G_COLOR, size=11)

    # 4 -> 5
    draw_dashed_line((n4_x1, mid_y), (n5_x0, mid_y), fill=G_COLOR, width=2)
    draw_arrow_head((n5_x0, mid_y), "right", color=G_COLOR, size=11)

    # =========================================================================
    # 7. Section 02 : 수정 (Container & Return Flow)
    # =========================================================================
    s2_y0, s2_y1 = 355, 590
    draw_dashed_box((s1_x0, s2_y0, s1_x1, s2_y1), outline=(148, 163, 184, 255), width=1)
    draw.text((s1_x0 + 24, s2_y0 + 18), "02  /  수정", font=f_sec_title, fill=(71, 85, 105, 255))

    mny0, mny1 = 425, 540

    # Mod Node 1: 장소↓ (이름 변경)
    mn1_x0 = 130
    mn1_x1 = mn1_x0 + node_w
    draw_node_card((mn1_x0, mny0, mn1_x1, mny1), "장소 ↓", "이름 변경", 
                   (30, 41, 59, 255), (71, 85, 105, 255), (248, 250, 252, 255), (148, 163, 184, 255), "edit")

    # Mod Node 2: 택시↓ (시간 변경)
    mn2_x0 = 1015
    mn2_x1 = mn2_x0 + node_w
    draw_node_card((mn2_x0, mny0, mn2_x1, mny1), "택시 ↓", "시간 변경", 
                   (30, 41, 59, 255), (71, 85, 105, 255), (248, 250, 252, 255), (148, 163, 184, 255), "edit")

    # Purple Return Arrows
    P_COLOR = (139, 92, 246, 255)

    # Return Line 1: 장소 이름 변경 -> 장소 (다시)
    n1_mid_x = (n1_x0 + n1_x1) // 2
    draw_dashed_line((n1_mid_x, mny0), (n1_mid_x, ny1), fill=P_COLOR, width=2)
    draw_arrow_head((n1_mid_x, ny1), "up", color=P_COLOR, size=10)
    draw.text((n1_mid_x - 14, (mny0 + ny1) // 2 - 8), "다시", font=f_label, fill=(124, 58, 237, 255))

    # Return Line 2: 장소 이름 변경 -> 택시 도착지 연쇄 (도착지 연쇄)
    # Origin: top-right of mn1 -> x=755, y=390 -> up to bottom-left of n3
    n3_target_x1 = n3_x0 + 35
    draw_dashed_line((mn1_x1, 400), (n3_target_x1, 400), fill=P_COLOR, width=2)
    draw_dashed_line((mn1_x1, mny0 + 30), (mn1_x1, 400), fill=P_COLOR, width=2)
    draw_dashed_line((n3_target_x1, 400), (n3_target_x1, ny1), fill=P_COLOR, width=2)
    draw_arrow_head((n3_target_x1, ny1), "up", color=P_COLOR, size=10)
    draw.text((420, 380), "도착지 연쇄", font=f_label, fill=(124, 58, 237, 255))

    # Return Line 3: 택시 시간 변경 -> 택시 블록 복귀
    n3_target_x2 = n3_x0 + 80
    mn2_mid_x = (mn2_x0 + mn2_x1) // 2
    draw_dashed_line((mn2_mid_x, mny0), (mn2_mid_x, 400), fill=P_COLOR, width=2)
    draw_dashed_line((mn2_mid_x, 400), (n3_target_x2, 400), fill=P_COLOR, width=2)
    draw_dashed_line((n3_target_x2, 400), (n3_target_x2, ny1), fill=P_COLOR, width=2)
    draw_arrow_head((n3_target_x2, ny1), "up", color=P_COLOR, size=10)

    # =========================================================================
    # 8. Legend (Bottom)
    # =========================================================================
    leg_y = 650
    draw.text((60, leg_y), "Legend", font=f_legend_title, fill=(15, 23, 42, 255))

    items = [
        ("User UI", "1", (224, 242, 254, 255), (2, 132, 199, 255), (3, 105, 161, 255)),
        ("Agent logic", "1", (236, 253, 245, 255), (16, 185, 129, 255), (4, 120, 87, 255)),
        ("Context / trace", "2", (243, 232, 255, 255), (168, 85, 247, 255), (107, 33, 168, 255)),
        ("Cloud service", "1", (254, 243, 199, 255), (245, 158, 11, 255), (180, 83, 9, 255)),
        ("External system", "2", (241, 245, 249, 255), (148, 163, 184, 255), (71, 85, 105, 255))
    ]

    cur_x = 165
    for name, num, fill_c, stroke_c, text_c in items:
        pw = 150 if len(name) > 10 else 125
        draw.rounded_rectangle((cur_x, leg_y - 3, cur_x + pw, leg_y + 25), radius=6, fill=fill_c, outline=stroke_c, width=1)
        draw.text((cur_x + 10, leg_y + 3), name, font=f_legend, fill=text_c)
        # Small circle badge
        circle_x = cur_x + pw - 20
        draw.ellipse((circle_x, leg_y + 4, circle_x + 14, leg_y + 18), fill=(255, 255, 255, 255), outline=stroke_c, width=1)
        draw.text((circle_x + 4, leg_y + 3), num, font=f_legend_num, fill=text_c)
        cur_x += pw + 18

    # Save PNG
    output_path = "c:/dev/0827taxi_child/flow_diagram.png"
    img.convert("RGB").save(output_path, "PNG", quality=95)
    print(f"Refined Perfect Flow Diagram saved to {output_path}")

if __name__ == "__main__":
    generate_perfect_flow_diagram()
