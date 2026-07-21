import os
import shutil
import subprocess
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:8000"
SCREENSHOT_DIR = "screenshots"
TEMP_FRAME_DIR = "temp_frames"

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def clear_dir(path):
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path)

def set_dark_theme(page):
    page.evaluate("""
        document.documentElement.classList.add('dark');
        localStorage.setItem('app_theme', 'dark');
    """)

def inject_custom_pointer(page):
    page.evaluate("""
    if (!document.getElementById('custom-mouse-style')) {
        const style = document.createElement('style');
        style.id = 'custom-mouse-style';
        style.innerHTML = `
          #custom-mouse-pointer {
            position: fixed;
            top: -100px;
            left: -100px;
            width: 22px;
            height: 22px;
            background: rgba(239, 68, 68, 0.9);
            border: 2px solid #ffffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transform: translate(-50%, -50%);
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          }
          .custom-ripple {
            position: fixed;
            width: 40px;
            height: 40px;
            border: 3px solid rgba(239, 68, 68, 0.9);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999998;
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 1;
            animation: custom-ripple-anim 0.35s ease-out forwards;
          }
          @keyframes custom-ripple-anim {
            to {
              transform: translate(-50%, -50%) scale(1.6);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
        const pointer = document.createElement('div');
        pointer.id = 'custom-mouse-pointer';
        document.body.appendChild(pointer);
    }
    """)

class AnimationRecorder:
    def __init__(self, page, frames_dir):
        self.page = page
        self.frames_dir = frames_dir
        self.frame_count = 0
        self.current_pos = (400, 300)
        clear_dir(self.frames_dir)

    def capture_frame(self, repeat=1):
        for _ in range(repeat):
            self.frame_count += 1
            filename = os.path.join(self.frames_dir, f"frame_{self.frame_count:04d}.png")
            self.page.screenshot(path=filename)

    def update_pointer(self, x, y):
        self.page.evaluate(f"""
            const p = document.getElementById('custom-mouse-pointer');
            if (p) {{
                p.style.left = '{x}px';
                p.style.top = '{y}px';
            }}
        """)

    def move_to(self, x, y, steps=6):
        start_x, start_y = self.current_pos
        for i in range(1, steps + 1):
            cur_x = start_x + (x - start_x) * (i / steps)
            cur_y = start_y + (y - start_y) * (i / steps)
            self.update_pointer(cur_x, cur_y)
            self.capture_frame(repeat=1)
        self.current_pos = (x, y)

    def move_to_element(self, selector_or_locator, steps=6):
        if isinstance(selector_or_locator, str):
            loc = self.page.locator(selector_or_locator).first
        else:
            loc = selector_or_locator

        if loc.count() == 0:
            return self.current_pos

        box = loc.bounding_box()
        if box:
            target_x = box['x'] + box['width'] / 2
            target_y = box['y'] + box['height'] / 2
            self.move_to(target_x, target_y, steps=steps)
            return target_x, target_y
        return self.current_pos

    def click_element(self, selector_or_locator, steps=6):
        if isinstance(selector_or_locator, str):
            loc = self.page.locator(selector_or_locator).first
        else:
            loc = selector_or_locator

        if loc.count() == 0:
            return

        box = loc.bounding_box()
        if box:
            target_x = box['x'] + box['width'] / 2
            target_y = box['y'] + box['height'] / 2
            self.move_to(target_x, target_y, steps=steps)
            
            # Ripple
            self.page.evaluate(f"""
                const r = document.createElement('div');
                r.className = 'custom-ripple';
                r.style.left = '{target_x}px';
                r.style.top = '{target_y}px';
                document.body.appendChild(r);
                setTimeout(() => r.remove(), 400);
            """)
            self.capture_frame(repeat=2)
            loc.click()
            self.capture_frame(repeat=3)

    def type_text(self, selector_or_locator, text, steps_per_char=1):
        if isinstance(selector_or_locator, str):
            loc = self.page.locator(selector_or_locator).first
        else:
            loc = selector_or_locator

        if loc.count() == 0:
            return

        box = loc.bounding_box()
        if box:
            self.move_to(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            loc.click()
            self.capture_frame(repeat=1)
        
        # Clear existing text if any
        loc.fill("")
        
        # Type character by character
        typed = ""
        for char in text:
            typed += char
            loc.fill(typed)
            loc.dispatch_event("input")
            loc.dispatch_event("change")
            self.capture_frame(repeat=steps_per_char)
        self.capture_frame(repeat=2)


def generate_static_screenshots(playwright):
    print("=== Generating Static Screenshots ===")
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        device_scale_factor=2,
        locale="ja-JP"
    )
    page = context.new_page()

    ensure_dir(SCREENSHOT_DIR)

    # 1. 公開フォーム入力画面 (contact_input.jpg)
    print("Capturing contact_input.jpg...")
    page.goto(f"{BASE_URL}/contact")
    set_dark_theme(page)
    page.fill("#name", "山田 太郎")
    page.fill("#email", "yamada@example.com")
    page.fill("#subject", "商品のお問い合わせ")
    page.fill("#body", "商品の詳細と納期について確認させていただけますでしょうか。\n何卒よろしくお願いいたします。")
    page.evaluate("""
        document.querySelectorAll('input, textarea').forEach(el => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
    """)
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SCREENSHOT_DIR}/contact_input.jpg", type="jpeg", quality=90, full_page=True)

    # 2. 確認画面 (contact_confirm.jpg)
    print("Capturing contact_confirm.jpg...")
    page.click('button[type="submit"]')
    page.wait_for_selector('h2:has-text("お問い合わせ内容確認")')
    set_dark_theme(page)
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SCREENSHOT_DIR}/contact_confirm.jpg", type="jpeg", quality=90, full_page=True)

    # 3. ログイン画面 (admin_login.jpg)
    print("Capturing admin_login.jpg...")
    page.goto(f"{BASE_URL}/login")
    set_dark_theme(page)
    page.fill("#email", "admin@example.test")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SCREENSHOT_DIR}/admin_login.jpg", type="jpeg", quality=90, full_page=True)

    # 4. 管理画面一覧 (admin_dashboard.jpg)
    print("Capturing admin_dashboard.jpg...")
    page.fill("#password", "local-only-not-a-secret")
    page.click('button[type="submit"]')
    page.wait_for_selector('h2:has-text("お問い合わせ一覧")')
    set_dark_theme(page)
    # 絞り込みアコーディオンを開いた状態
    page.evaluate("""
        const filters = document.querySelector('[x-data="contactFilters"]');
        if (filters && window.Alpine) {
            const data = Alpine.$data(filters);
            if (data && !data.isExpanded) data.isExpanded = true;
        }
    """)
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SCREENSHOT_DIR}/admin_dashboard.jpg", type="jpeg", quality=90, full_page=True)

    # 5. 詳細画面 (admin_show.jpg)
    print("Capturing admin_show.jpg...")
    first_show_link = page.locator('a:has-text("詳細")').first
    first_show_link.click()
    page.wait_for_selector('h2:has-text("お問い合わせ詳細")')
    set_dark_theme(page)
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SCREENSHOT_DIR}/admin_show.jpg", type="jpeg", quality=90, full_page=True)

    browser.close()
    print("Static screenshots generated successfully.")


def generate_demo_public_form_gif(playwright):
    print("=== Generating demo_public_form.gif ===")
    frames_dir = os.path.join(TEMP_FRAME_DIR, "public_form")
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        device_scale_factor=1,
        locale="ja-JP"
    )
    page = context.new_page()
    recorder = AnimationRecorder(page, frames_dir)

    page.goto(f"{BASE_URL}/contact")
    set_dark_theme(page)
    inject_custom_pointer(page)
    recorder.update_pointer(400, 200)
    recorder.capture_frame(repeat=3)

    # 入力
    recorder.type_text("#name", "山田 太郎", steps_per_char=1)
    recorder.type_text("#email", "yamada@example.com", steps_per_char=1)
    recorder.type_text("#subject", "商品の詳細確認について", steps_per_char=1)
    recorder.type_text("#body", "商品の在庫状況と納期の目安について教えいただけますでしょうか。\nよろしくお願いします。", steps_per_char=1)

    recorder.capture_frame(repeat=5)

    # 確認画面へ進む
    recorder.click_element('button[type="submit"]')
    page.wait_for_selector('h2:has-text("お問い合わせ内容確認")')
    set_dark_theme(page)
    inject_custom_pointer(page)
    recorder.update_pointer(600, 300)
    recorder.capture_frame(repeat=5)

    # 送信ボタンクリック
    submit_btn = page.locator('button[name="action"][value="submit"], button[type="submit"]:has-text("送信する")')
    recorder.click_element(submit_btn)
    page.wait_for_selector('h1:has-text("お問い合わせありがとうございました")')
    set_dark_theme(page)
    inject_custom_pointer(page)
    recorder.update_pointer(600, 400)
    recorder.capture_frame(repeat=10)

    browser.close()

    # Convert to GIF via ffmpeg
    gif_path = os.path.join(SCREENSHOT_DIR, "demo_public_form.gif")
    cmd = (
        f'ffmpeg -y -framerate 8 -i "{frames_dir}/frame_%04d.png" '
        f'-vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" '
        f'"{gif_path}"'
    )
    print("Running ffmpeg for demo_public_form.gif...")
    subprocess.run(cmd, shell=True, check=True)
    print("demo_public_form.gif created successfully.")


def generate_demo_admin_dashboard_gif(playwright):
    print("=== Generating demo_admin_dashboard.gif ===")
    frames_dir = os.path.join(TEMP_FRAME_DIR, "admin_dashboard")
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        device_scale_factor=1,
        locale="ja-JP"
    )
    page = context.new_page()
    recorder = AnimationRecorder(page, frames_dir)

    # 1. ログイン画面
    page.goto(f"{BASE_URL}/login")
    set_dark_theme(page)
    inject_custom_pointer(page)
    recorder.update_pointer(400, 200)
    recorder.capture_frame(repeat=3)

    recorder.type_text("#email", "admin@example.test", steps_per_char=1)
    recorder.type_text("#password", "local-only-not-a-secret", steps_per_char=1)
    recorder.click_element('button[type="submit"]')

    # 2. 一覧画面
    page.wait_for_selector('h2:has-text("お問い合わせ一覧")')
    set_dark_theme(page)
    inject_custom_pointer(page)
    recorder.update_pointer(600, 200)
    recorder.capture_frame(repeat=5)

    # テーマ切替ボタンをクリック（ダーク -> ライト -> ダーク）
    theme_toggle = page.locator('#theme-toggle-button, button[aria-label*="テーマ"], button[aria-label*="theme"], button[x-data*="themeToggle"]').first
    if theme_toggle.count() > 0:
        recorder.click_element(theme_toggle)
        recorder.capture_frame(repeat=5)
        recorder.click_element(theme_toggle)
        set_dark_theme(page)
        recorder.capture_frame(repeat=5)

    # ステータス複数チェックボックス操作
    status_checkboxes = page.locator('input[name="status[]"]')
    if status_checkboxes.count() >= 2:
        recorder.click_element(status_checkboxes.nth(0))
        page.wait_for_timeout(300)
        recorder.capture_frame(repeat=4)
        recorder.click_element(status_checkboxes.nth(1))
        page.wait_for_timeout(300)
        recorder.capture_frame(repeat=4)

    # 検索キー入力
    recorder.type_text("#keyword", "商品", steps_per_char=1)
    page.wait_for_timeout(600)
    recorder.capture_frame(repeat=5)

    # 詳細表示をクリック
    detail_link = page.locator('a:has-text("詳細")').first
    recorder.click_element(detail_link)

    # 3. 詳細画面
    page.wait_for_selector('h2:has-text("お問い合わせ詳細")')
    set_dark_theme(page)
    inject_custom_pointer(page)
    recorder.update_pointer(600, 300)
    recorder.capture_frame(repeat=6)

    # ステータス変更ドロップダウン操作
    status_select = page.locator('select[name="status"]')
    if status_select.count() > 0:
        recorder.move_to_element(status_select)
        status_select.select_option("in_progress")
        recorder.capture_frame(repeat=4)

    # 一覧に戻るリンク
    back_link = page.locator('a:has-text("一覧に戻る")').first
    if back_link.count() > 0:
        recorder.click_element(back_link)
        page.wait_for_selector('h2:has-text("お問い合わせ一覧")')
        set_dark_theme(page)
        inject_custom_pointer(page)
        recorder.capture_frame(repeat=6)

    browser.close()

    # Convert to GIF via ffmpeg
    gif_path = os.path.join(SCREENSHOT_DIR, "demo_admin_dashboard.gif")
    cmd = (
        f'ffmpeg -y -framerate 8 -i "{frames_dir}/frame_%04d.png" '
        f'-vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" '
        f'"{gif_path}"'
    )
    print("Running ffmpeg for demo_admin_dashboard.gif...")
    subprocess.run(cmd, shell=True, check=True)
    print("demo_admin_dashboard.gif created successfully.")


if __name__ == "__main__":
    with sync_playwright() as playwright:
        generate_static_screenshots(playwright)
        generate_demo_public_form_gif(playwright)
        generate_demo_admin_dashboard_gif(playwright)
    
    # Clean up temp frames
    if os.path.exists(TEMP_FRAME_DIR):
        shutil.rmtree(TEMP_FRAME_DIR)
    print("=== All screenshots and demos successfully updated! ===")
