from PIL import Image, ImageDraw, ImageFont
import os

# Create a 1024x1024 icon
size = 1024
img = Image.new('RGBA', (size, size), (10, 10, 26, 255))  # #0a0a1a
draw = ImageDraw.Draw(img)

# Draw a stylized business card shape
card_w, card_h = 600, 360
card_x = (size - card_w) // 2
card_y = (size - card_h) // 2 - 40

# Card background (slightly lighter)
draw.rounded_rectangle(
    [card_x, card_y, card_x + card_w, card_y + card_h],
    radius=24,
    fill=(30, 30, 46, 255)  # #1e1e2e
)

# Scan line effect
line_y = card_y + 80
draw.rectangle([card_x + 40, line_y, card_x + card_w - 40, line_y + 4], fill=(108, 92, 231, 200))

# Card detail lines (simulating text)
line_start = card_y + 120
for i in range(4):
    y = line_start + i * 40
    w = [300, 200, 250, 180][i]
    draw.rounded_rectangle(
        [card_x + 50, y, card_x + 50 + w, y + 12],
        radius=6,
        fill=(108, 92, 231, 60 + i * 20)
    )

# Purple accent circle (scan indicator)
cx, cy = size // 2, card_y - 60
r = 40
draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(108, 92, 231, 255))

# "CK" initials in the circle
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
except:
    font = ImageFont.load_default()
draw.text((cx, cy), "CK", fill=(255, 255, 255, 255), font=font, anchor="mm")

# Bottom text area
try:
    font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
except:
    font_small = font
draw.text((size // 2, card_y + card_h + 80), "CardKeeper", fill=(108, 92, 231, 255), font=font_small, anchor="mm")

# Save as icon.png
img.convert('RGB').save('assets/icon.png', 'PNG')

# Create adaptive icon (foreground)
fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
fg_draw = ImageDraw.Draw(fg)
# Just the card + circle, centered, no background
fg_draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=24, fill=(30, 30, 46, 255))
fg_draw.rectangle([card_x + 40, line_y, card_x + card_w - 40, line_y + 4], fill=(108, 92, 231, 200))
for i in range(4):
    y = line_start + i * 40
    w = [300, 200, 250, 180][i]
    fg_draw.rounded_rectangle([card_x + 50, y, card_x + 50 + w, y + 12], radius=6, fill=(108, 92, 231, 60 + i * 20))
fg_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(108, 92, 231, 255))
fg_draw.text((cx, cy), "CK", fill=(255, 255, 255, 255), font=font, anchor="mm")
fg.convert('RGB').save('assets/adaptive-icon.png', 'PNG')

# Splash icon (same as icon)
img.copy().save('assets/splash-icon.png', 'PNG')

# Favicon (smaller)
small = img.resize((64, 64), Image.LANCZOS)
small.save('assets/favicon.png', 'PNG')

print("Icons generated successfully!")
