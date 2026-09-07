from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

output = Path('/home/ubuntu/vidacard-tupan-lp/client/public')
output.mkdir(parents=True, exist_ok=True)

size = 512
image = Image.new('RGB', (size, size), '#050505')
draw = ImageDraw.Draw(image)

font_candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
]
font_path = next((path for path in font_candidates if Path(path).exists()), None)
if not font_path:
    raise RuntimeError('Nenhuma fonte sans-serif em negrito foi encontrada no ambiente.')
font = ImageFont.truetype(font_path, 190)

label = 'TP'
bounds = draw.textbbox((0, 0), label, font=font)
text_width = bounds[2] - bounds[0]
text_height = bounds[3] - bounds[1]
text_x = (size - text_width) // 2 - bounds[0]
text_y = (size - text_height) // 2 - bounds[1] - 8

draw.rounded_rectangle((28, 28, size - 28, size - 28), radius=72, outline='#2d2d2d', width=5)
draw.text((text_x, text_y), label, font=font, fill='#f5f5f5', spacing=0)

image.save(output / 'favicon.png', format='PNG', optimize=True)
image.resize((180, 180), Image.Resampling.LANCZOS).save(output / 'apple-touch-icon.png', format='PNG', optimize=True)
image.save(output / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
