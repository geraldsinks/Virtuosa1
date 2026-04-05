import os

file_path = r'c:\Users\HP USER\Desktop\Virtuosa\client\pages\marketing.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'Rakuten Style</option>' in line:
        indent = line[:line.find('<')]
        new_lines.append(f"{indent}<option value=\"modern-minimal\" ${{currentPresetStyle==='modern-minimal' ? 'selected' : '' }}>✨ Modern Minimal</option>\n")
        new_lines.append(f"{indent}<option value=\"vibrant-mosaic\" ${{currentPresetStyle==='vibrant-mosaic' ? 'selected' : '' }}>🎨 Vibrant Mosaic</option>\n")
        new_lines.append(f"{indent}<option value=\"editorial-gallery\" ${{currentPresetStyle==='editorial-gallery' ? 'selected' : '' }}>📸 Editorial Gallery</option>\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated marketing.html")
