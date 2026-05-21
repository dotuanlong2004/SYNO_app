# Tạo Icon cho HNSEDU App

## Bước 1: Tạo file ICO từ SVG

### Cách 1: Dùng Online Converter (Khuyến nghị)
1. Mở file `windows/runner/resources/hnsedu_logo.svg`
2. Truy cập: https://convertio.co/svg-ico/
3. Upload file SVG và convert sang ICO
4. Download file ICO về
5. Đổi tên thành `app_icon.ico`
6. Copy đè vào `windows/runner/resources/app_icon.ico`

### Cách 2: Dùng ImageMagick
```bash
cd windows/runner/resources
magick convert -background transparent hnsedu_logo.svg -define icon:auto-resize=256,128,64,48,32,16 app_icon.ico
```

### Cách 3: Dùng Python
```bash
pip install cairosvg
python -c "import cairosvg; cairosvg.svg2png(url='windows/runner/resources/hnsedu_logo.svg', write_to='logo.png', output_width=256, output_height=256)"
```
Sau đó convert PNG sang ICO dùng online tool.

## Bước 2: Build lại app
```bash
flutter clean
flutter build windows --debug
```

## Thông tin Icon
- **Format**: ICO (Windows Icon)
- **Sizes**: 16x16, 32x32, 48x48, 256x256
- **Source**: `hnsedu_logo.svg`
- **Destination**: `windows/runner/resources/app_icon.ico`
