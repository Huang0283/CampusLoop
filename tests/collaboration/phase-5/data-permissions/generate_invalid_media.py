import os
from pathlib import Path

MEDIA_DIR = Path(__file__).parent / "media"

def generate():
    os.makedirs(MEDIA_DIR, exist_ok=True)
    
    # 1. 伪装成 jpg 的文本
    with open(MEDIA_DIR / "invalid-fake.jpg", "w") as f:
        f.write("This is not an image")
        
    # 2. 截断的图片 (假数据)
    with open(MEDIA_DIR / "invalid-truncated.png", "wb") as f:
        f.write(b'\x89PNG\r\n\x1a\n' + b'\x00' * 10)
        
    print(f"已生成非法媒体文件到 {MEDIA_DIR}")

if __name__ == "__main__":
    generate()