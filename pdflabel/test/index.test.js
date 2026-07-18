import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// HTML の中身を読み込む
const htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('PDF Label Studio Tests', () => {
  
  beforeAll(() => {
    // グローバルオブジェクトのモック
    // コンストラクタとしての new 呼び出しに対応するため、クラスとしてモックを定義
    class MockJsPDF {
      constructor() {
        this.addFileToVFS = vi.fn();
        this.addFont = vi.fn();
        this.setFont = vi.fn();
        this.setFontSize = vi.fn();
        this.setDrawColor = vi.fn();
        this.setLineWidth = vi.fn();
        this.rect = vi.fn();
        this.splitTextToSize = vi.fn().mockImplementation((text, maxW) => {
          if (text === '') return [];
          if (text.includes('\n')) return text.split('\n');
          if (text.length > 50) return ['line1', 'line2', 'line3', 'line4', 'line5', 'line6', 'line7', 'line8'];
          return [text];
        });
        this.text = vi.fn();
        this.output = vi.fn().mockReturnValue(new Blob(['pdf-data'], { type: 'application/pdf' }));
      }
    }

    window.jspdf = {
      jsPDF: MockJsPDF
    };

    // labelList プリセットの初期モック
    window.labelList = [
      {
        name: "テストプリセット 1",
        paperSize: "A4",
        topMargin: 10,
        bottomMargin: 10,
        leftMargin: 10,
        rightMargin: 10,
        labelWidth: 70,
        labelHeight: 37,
        colSpacing: 2,
        rowSpacing: 2
      },
      {
        name: "エーワン テスト 2",
        paperSize: "A4",
        topMargin: 10,
        bottomMargin: 10,
        leftMargin: 10,
        rightMargin: 10,
        labelWidth: 70,
        labelHeight: 37,
        colSpacing: 2,
        rowSpacing: 2,
        borderRadius: 2
      }
    ];

    // URL.createObjectURL のモック
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-pdf-url');
    
    // window.open のモック
    window.open = vi.fn();
    
    // alert のモック
    window.alert = vi.fn();

    // fetch のモック (初期プリロード時は失敗させてキャッシュを作らない)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock;

    // FileReader のモック (onloadend と onerror をシミュレート)
    class MockFileReader {
      constructor() {
        this.onloadend = null;
        this.onerror = null;
        this.result = null;
      }
      readAsDataURL(blob) {
        if (blob && blob.size === 999) { // テスト用のエラーシグナル
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('FileReader mock error'));
          }, 0);
          return;
        }
        if (blob && blob.size === 888) { // テスト用の無効形式シグナル
          setTimeout(() => {
            this.result = 'data:font/ttf;invalid-base64';
            if (this.onloadend) this.onloadend();
          }, 0);
          return;
        }
        setTimeout(() => {
          this.result = 'data:font/ttf;base64,TU9DS19CQVNFNjRfRk9OVA==';
          if (this.onloadend) this.onloadend();
        }, 0);
      }
    }
    window.FileReader = MockFileReader;

    // テスト中の警告ログ（フォント取得失敗など）のスタックトレース出力を抑制してログをクリーンに保つ
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // 1. DOM環境の再初期化（DOMツリーの完全リセット）
    document.documentElement.innerHTML = htmlContent;

    // 2. index.js のキャッシュを削除して再読み込み
    // これにより、ファイル内のローカル変数（customLayoutState や cachedFontBase64）が完全に null にリセットされ、
    // テスト間の状態リークが完全に防止される
    const jsPath = require.resolve('../index.js');
    delete require.cache[jsPath];
    require('../index.js');
    
    // 3. DOMContentLoaded イベントを発火させて初期化を走らせる
    const event = new window.Event('DOMContentLoaded');
    window.dispatchEvent(event);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setFetchMock = (mockFn) => {
    vi.stubGlobal('fetch', mockFn);
    window.fetch = mockFn;
  };

  it('should initialize presets and preview on DOMContentLoaded', () => {
    const presetSelect = document.getElementById('presetSelect');
    expect(presetSelect.options.length).toBe(3); // 2つのモックプリセット + 1つのカスタム
    expect(presetSelect.value).toBe('0');
    
    const previewPage = document.getElementById('previewPage');
    expect(previewPage.children.length).toBeGreaterThan(0); // 余白ガイドやプレビューカードが作られること
  });

  it('should fallback to custom preset when labelList fails to load', () => {
    const originalLabelList = window.labelList;
    delete window.labelList;
    
    // initializePresetsを手動実行して例外パスを通す
    window.initializePresets();

    const presetSelect = document.getElementById('presetSelect');
    expect(presetSelect.options[0].textContent).toContain('エラー: プリセット読み込み失敗');
    
    // フォールバックにより、カスタムレイアウト値が代入されていること
    expect(document.getElementById('topMargin').value).toBe('10');

    // テスト後クリーンアップ
    window.labelList = originalLabelList;
  });

  it('should calculate layout correctly for standard parameters', () => {
    const layout = window.calculateLayout();
    expect(layout.cols).toBe(2); // (210 - 10 - 10 + 2) / (70 + 2) = 192 / 72 = 2.6 -> 2列
    expect(layout.rows).toBe(7); // (297 - 10 - 10 + 2) / (37 + 2) = 279 / 39 = 7.15 -> 7行
    expect(layout.total).toBe(14);
  });

  it('should handle zero or negative row/col spacing and values gracefully', () => {
    // 極端なパラメータを入力
    document.getElementById('topMargin').value = '150';
    document.getElementById('bottomMargin').value = '150'; // 150+150 = 300 > 297
    document.getElementById('labelWidth').value = '0'; // invalid
    document.getElementById('labelHeight').value = '0'; // invalid

    const layout = window.calculateLayout();
    expect(layout.cols).toBe(64); // width 0 is fallback to 1, col spacing 2 -> (190+2)/(1+2) = 64
    expect(layout.rows).toBe(0);
    expect(layout.total).toBe(0);
    
    // プレビューの描画チェック
    window.updatePreview();
    const layoutWarning = document.getElementById('layoutWarning');
    expect(layoutWarning.style.display).toBe('block');
    expect(layoutWarning.textContent).toContain('警告');
  });

  it('should return 0 for layout rows/cols when calculating negative or NaN results', () => {
    // NaN になるように設定 (左右マージン 106 + 106 = 212 > A4幅210)
    document.getElementById('topMargin').value = '106';
    document.getElementById('bottomMargin').value = '106';
    document.getElementById('leftMargin').value = '106';
    document.getElementById('rightMargin').value = '106';
    document.getElementById('colSpacing').value = '2';
    document.getElementById('rowSpacing').value = '2';
    document.getElementById('labelWidth').value = '-2'; // colSpacing + labelWidth = 0 (NaN発生用)
    document.getElementById('labelHeight').value = '-2'; // rowSpacing + labelHeight = 0 (NaN発生用)

    const layout = window.calculateLayout();
    expect(layout.cols).toBe(0);
    expect(layout.rows).toBe(0);
    expect(layout.total).toBe(0);

    // cols / rows がマイナス値になるように設定
    document.getElementById('leftMargin').value = '110';
    document.getElementById('rightMargin').value = '110'; // 110 + 110 = 220 > 210
    document.getElementById('labelWidth').value = '10'; // availW + colSp = -10 + 2 = -8 < 0
    document.getElementById('colSpacing').value = '0'; // 分母 > 0

    const layoutNegative = window.calculateLayout();
    expect(layoutNegative.cols).toBe(0);
  });

  it('should update preview when form inputs change', () => {
    const topMarginInput = document.getElementById('topMargin');
    topMarginInput.value = '15';
    
    // inputイベントをディスパッチ
    topMarginInput.dispatchEvent(new window.Event('input'));
    
    // プリセットが「カスタム」に変更されること
    const presetSelect = document.getElementById('presetSelect');
    expect(presetSelect.value).toBe('custom');
    
    // レイアウトが再計算されること
    const layout = window.calculateLayout();
    expect(layout.tMargin).toBe(15);
  });

  it('should fallback font size when font size input is empty or NaN', () => {
    const fontSizeInput = document.getElementById('fontSize');
    fontSizeInput.value = ''; // parseFloat が NaN になる

    window.updatePreview();
    
    // プレビューのフォントサイズがデフォルト値 (10pt * PT_TO_MM = 3.528mm) になること
    const labelContent = document.querySelector('.label-text-content');
    expect(labelContent.style.fontSize).toContain('3.528');
  });

  it('should change classes based on draw borders checkbox', () => {
    const drawBordersCheckbox = document.getElementById('drawBorders');
    drawBordersCheckbox.checked = false;
    drawBordersCheckbox.dispatchEvent(new window.Event('change'));
    
    const labelDivs = document.querySelectorAll('.preview-label');
    if (labelDivs.length > 0) {
      expect(labelDivs[0].className).toContain('no-border');
    }
  });

  it('should apply and switch preset when selection changes', () => {
    const presetSelect = document.getElementById('presetSelect');
    
    // カスタムに切り替え
    presetSelect.value = 'custom';
    presetSelect.dispatchEvent(new window.Event('change'));
    expect(document.getElementById('topMargin').value).toBe('10');
    
    // 存在しないインデックスを設定してchange
    presetSelect.value = '999';
    presetSelect.dispatchEvent(new window.Event('change'));
    // 値が維持されていること (リターン処理のテスト)
    expect(document.getElementById('topMargin').value).toBe('10');

    // 最初のプリセット（index: 0）に変更
    presetSelect.value = '0';
    presetSelect.dispatchEvent(new window.Event('change'));
    expect(document.getElementById('topMargin').value).toBe('10');
  });

  it('should apply customLayoutState if already exists when preset is custom', () => {
    // まず一度値を入力して customLayoutState をセットさせる
    const topMarginInput = document.getElementById('topMargin');
    topMarginInput.value = '25';
    topMarginInput.dispatchEvent(new window.Event('input'));

    // 他のプリセットに変える
    const presetSelect = document.getElementById('presetSelect');
    presetSelect.value = '0';
    presetSelect.dispatchEvent(new window.Event('change'));
    expect(topMarginInput.value).toBe('10'); // 一旦モック値に戻る

    // プリセットを再度 'custom' に変更
    presetSelect.value = 'custom';
    presetSelect.dispatchEvent(new window.Event('change'));
    expect(topMarginInput.value).toBe('25'); // さきほどの値が復元されること
  });

  it('should debounce text inputs', () => {
    const labelTextInput = document.getElementById('labelText');
    
    labelTextInput.value = 'さらに新しいデバウンステキスト';
    labelTextInput.dispatchEvent(new window.Event('input'));
    
    // まだ描画が更新されていないため、プレビュー内は以前の空文字列（または初期テキスト）のままのはず
    let labelContent = document.querySelector('.label-text-content');
    expect(labelContent ? labelContent.textContent : '').not.toBe('さらに新しいデバウンステキスト');
    
    // 150ms 進める
    vi.advanceTimersByTime(150);
    
    // 描画が更新され、新テキストが反映されているはず
    labelContent = document.querySelector('.label-text-content');
    expect(labelContent.textContent).toBe('さらに新しいデバウンステキスト');
  });

  it('should zoom the preview on button click', () => {
    const zoomButtons = document.querySelectorAll('.zoom-btn');
    const zoomBtnLarge = Array.from(zoomButtons).find(btn => btn.getAttribute('data-size') === '520px');
    
    zoomBtnLarge.click();
    expect(zoomBtnLarge.className).toContain('active');
    expect(document.documentElement.style.getPropertyValue('--preview-base-width')).toBe('520px');
  });

  it('should handle sample text and clear text buttons', () => {
    const sampleTextBtn = document.getElementById('sampleTextBtn');
    const clearTextBtn = document.getElementById('clearTextBtn');
    const labelTextInput = document.getElementById('labelText');
    
    sampleTextBtn.click();
    expect(labelTextInput.value).toContain('お届け先');
    
    clearTextBtn.click();
    expect(labelTextInput.value).toBe('');
  });

  // PDF生成関数のテスト
  describe('PDF Generation', () => {
    it('should generate PDF when generateBtn is clicked', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['font-binary'], { type: 'font/ttf' }))
      }));

      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      // 非同期のフォントフェッチとPDF生成を待つため、タイマーとPromiseを解決
      await vi.runAllTimersAsync();
      
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalled();
      expect(generateBtn.disabled).toBe(false);

      setFetchMock(originalFetch);
    });

    it('should use cached font if already loaded', async () => {
      const originalFetch = global.fetch;
      const successFetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['font-binary'], { type: 'font/ttf' }))
      });
      setFetchMock(successFetch);

      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      await vi.runAllTimersAsync();

      // フェッチモックの履歴クリア
      successFetch.mockClear();
      
      // 2回目の生成
      generateBtn.click();
      await vi.runAllTimersAsync();
      expect(successFetch).not.toHaveBeenCalled(); // キャッシュが効いているためフェッチが走らないこと

      setFetchMock(originalFetch);
    });

    it('should fail PDF generation if jsPDF is missing', async () => {
      const originalJsPDF = window.jspdf;
      delete window.jspdf;
      
      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('jsPDF ライブラリの読み込みに失敗しました'));
      
      // クリーンアップ
      window.jspdf = originalJsPDF;
    });

    it('should handle font fetch failure gracefully', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: false
      }));
      
      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('フォントファイルの取得に失敗しました'));

      setFetchMock(originalFetch);
    });

    it('should handle FileReader error gracefully', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['error'], { type: 'font/ttf' }))
      }));
      Object.defineProperty(Blob.prototype, 'size', { value: 999, configurable: true });

      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('FileReader mock error'));

      setFetchMock(originalFetch);
    });

    it('should handle invalid font data URL format gracefully', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['invalid'], { type: 'font/ttf' }))
      }));
      Object.defineProperty(Blob.prototype, 'size', { value: 888, configurable: true });

      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('フォント データ形式が無効です'));

      setFetchMock(originalFetch);
    });

    it('should generate PDF successfully when fetch is restored to ok', async () => {
      // 成功フェッチを走らせてキャッシュを作らせる
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['success-font'], { type: 'font/ttf' }))
      }));
      Object.defineProperty(Blob.prototype, 'size', { value: 100, configurable: true }); // 通常サイズ

      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalled();

      setFetchMock(originalFetch);
    });

    it('should skip drawing lines if total layout labels count is 0', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['font-binary'], { type: 'font/ttf' }))
      }));

      // レイアウト合計が 0 になるように設定
      document.getElementById('topMargin').value = '150';
      document.getElementById('bottomMargin').value = '150';
      document.getElementById('generateBtn').click();
      
      await vi.runAllTimersAsync();
      expect(window.URL.createObjectURL).toHaveBeenCalled();

      setFetchMock(originalFetch);
    });

    it('should wrap lines and break loop when exceeding label height in PDF', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['font-binary'], { type: 'font/ttf' }))
      }));

      // 非常に長い文字列を入力して折り返しとループ離脱のブレークを検証する
      const labelTextInput = document.getElementById('labelText');
      labelTextInput.value = 'とても長いテキスト'.repeat(100);
      
      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.URL.createObjectURL).toHaveBeenCalled();

      setFetchMock(originalFetch);
    });

    it('should generate PDF successfully when drawBorder is false, text is empty, or padding exceeds width', async () => {
      const originalFetch = global.fetch;
      setFetchMock(vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['font-binary'], { type: 'font/ttf' }))
      }));

      // 設定の変更
      document.getElementById('drawBorders').checked = false;
      document.getElementById('labelText').value = '   '; // 空白文字 (text.trim() === '')
      document.getElementById('padding').value = '50';
      document.getElementById('labelWidth').value = '10'; // maxTextWidth = 10 - 100 = -90 < 0

      const generateBtn = document.getElementById('generateBtn');
      generateBtn.click();
      
      await vi.runAllTimersAsync();
      expect(window.URL.createObjectURL).toHaveBeenCalled();

      setFetchMock(originalFetch);
    });
  });

  it('should test readLayoutInputs and calculateLayout with all empty inputs for default fallback branches', () => {
    // すべての入力要素を空文字列にする (parseFloat結果がNaNになり、|| の右辺が実行される)
    document.getElementById('topMargin').value = '';
    document.getElementById('bottomMargin').value = '';
    document.getElementById('leftMargin').value = '';
    document.getElementById('rightMargin').value = '';
    document.getElementById('labelWidth').value = '';
    document.getElementById('labelHeight').value = '';
    document.getElementById('colSpacing').value = '';
    document.getElementById('rowSpacing').value = '';

    // calculateLayout を呼ぶ (このときすべての入力が || 0 や || 1 にフォールバックする)
    const layout = window.calculateLayout();
    expect(layout.tMargin).toBe(0);
    expect(layout.lblW).toBe(1); // labelWidth は || 1
    expect(layout.colSp).toBe(0);

    // inputイベントを発生させて readLayoutInputs() 内の || 0 や || 1 も実行・検証する
    const topMarginInput = document.getElementById('topMargin');
    topMarginInput.dispatchEvent(new window.Event('input'));
  });

  describe('Visual Preset Selector Modal', () => {
    it('should open and close the modal', async () => {
      const openBtn = document.getElementById('openPresetModalBtn');
      const closeBtn = document.getElementById('closePresetModalBtn');
      const modal = document.getElementById('presetModal');

      expect(modal.classList.contains('active')).toBe(false);

      // Open
      openBtn.click();
      await vi.runAllTimersAsync();
      expect(modal.classList.contains('active')).toBe(true);

      // Close via close button
      closeBtn.click();
      expect(modal.classList.contains('active')).toBe(false);

      // Open again
      openBtn.click();
      await vi.runAllTimersAsync();
      expect(modal.classList.contains('active')).toBe(true);

      // Close via clicking overlay
      modal.click();
      expect(modal.classList.contains('active')).toBe(false);

      // Open again
      openBtn.click();
      await vi.runAllTimersAsync();
      expect(modal.classList.contains('active')).toBe(true);

      // Close via Escape key
      const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(escEvent);
      expect(modal.classList.contains('active')).toBe(false);

      // Test keydown other than Escape (which should not close the modal)
      openBtn.click();
      await vi.runAllTimersAsync();
      expect(modal.classList.contains('active')).toBe(true);

      const otherEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(otherEvent);
      expect(modal.classList.contains('active')).toBe(true);

      // Clean up closing the modal
      closeBtn.click();
    });

    it('should filter presets by manufacturer tabs', () => {
      const openBtn = document.getElementById('openPresetModalBtn');
      openBtn.click();

      const tabsContainer = document.getElementById('modalTabsContainer');
      const grid = document.getElementById('modalPresetGrid');

      // '全て' is active by default. We should have 'テストプリセット 1', 'エーワン テスト 2', and 'カスタムレイアウト' card
      expect(grid.children.length).toBe(3);

      // Click on 'コクヨ' tab
      const tabBtns = tabsContainer.children;
      const kokuyoTab = Array.from(tabBtns).find(btn => btn.textContent === 'コクヨ');
      expect(kokuyoTab).toBeDefined();
      
      kokuyoTab.click();
      // No presets start with 'コクヨ', and custom layout card is excluded when tab is not 'all'.
      expect(grid.children.length).toBe(0);

      // Click on 'エーワン' tab
      const aoneTab = Array.from(tabBtns).find(btn => btn.textContent === 'エーワン');
      expect(aoneTab).toBeDefined();
      aoneTab.click();
      // 'エーワン テスト 2' should be shown
      expect(grid.children.length).toBe(1);

      // Click on '全て' tab
      const allTab = Array.from(tabBtns).find(btn => btn.textContent === '全て');
      allTab.click();
      expect(grid.children.length).toBe(3);
    });

    it('should filter presets by search input', () => {
      const openBtn = document.getElementById('openPresetModalBtn');
      openBtn.click();

      const searchInput = document.getElementById('modalSearchInput');
      const grid = document.getElementById('modalPresetGrid');

      expect(grid.children.length).toBe(3);

      // Type search query that matches 'テスト'
      searchInput.value = 'テスト';
      searchInput.dispatchEvent(new window.Event('input'));
      expect(grid.children.length).toBe(2);

      // Type search query that matches 'エーワン'
      searchInput.value = 'エーワン';
      searchInput.dispatchEvent(new window.Event('input'));
      expect(grid.children.length).toBe(1);

      // Type search query that matches 'カスタム'
      searchInput.value = 'カスタム';
      searchInput.dispatchEvent(new window.Event('input'));
      expect(grid.children.length).toBe(1);

      // Type search query that matches nothing
      searchInput.value = 'nothing';
      searchInput.dispatchEvent(new window.Event('input'));
      expect(grid.children.length).toBe(0);
    });

    it('should select preset card and sync labels', () => {
      const openBtn = document.getElementById('openPresetModalBtn');
      openBtn.click();

      const grid = document.getElementById('modalPresetGrid');
      const presetSelect = document.getElementById('presetSelect');
      const selectedName = document.getElementById('selectedPresetName');

      // Click on the custom layout card (index 2)
      const customCard = grid.children[2];
      customCard.click();

      expect(presetSelect.value).toBe('custom');
      expect(selectedName.textContent).toBe('カスタムレイアウト...');
      expect(document.getElementById('presetModal').classList.contains('active')).toBe(false);

      // Open and select index 0
      openBtn.click();
      const testCard = grid.children[0];
      testCard.click();

      expect(presetSelect.value).toBe('0');
      expect(selectedName.textContent).toBe('テストプリセット 1');
      expect(document.getElementById('presetModal').classList.contains('active')).toBe(false);
    });

    it('should fallback sync label if presetSelect has empty options or fallback error', () => {
      const presetSelect = document.getElementById('presetSelect');
      const selectedName = document.getElementById('selectedPresetName');

      // Set value to something invalid
      presetSelect.value = 'invalid-index';
      
      const originalLabelList = window.labelList;
      delete window.labelList;
      
      window.initializePresets();
      expect(selectedName.textContent).toContain('エラー: プリセット読み込み失敗');

      // Clean up
      window.labelList = originalLabelList;
      window.initializePresets();
    });

    it('should handle rendering fallback when labelList is not loaded', () => {
      const originalLabelList = window.labelList;
      delete window.labelList;
      
      const openBtn = document.getElementById('openPresetModalBtn');
      openBtn.click();
      
      const grid = document.getElementById('modalPresetGrid');
      expect(grid.children.length).toBe(0);
      
      // Clean up
      window.labelList = originalLabelList;
      const closeBtn = document.getElementById('closePresetModalBtn');
      closeBtn.click();
    });

    it('should cover no-spacing and no-borderRadius branches in generatePresetMiniSvg', () => {
      const originalLabelList = window.labelList;
      window.labelList = [
        {
          name: "テスト 0-spacing",
          paperSize: "A4",
          topMargin: 10,
          bottomMargin: 10,
          leftMargin: 10,
          rightMargin: 10,
          labelWidth: 70,
          labelHeight: 37,
          colSpacing: 0,
          rowSpacing: 0
        }
      ];
      window.initializePresets();
      
      const openBtn = document.getElementById('openPresetModalBtn');
      openBtn.click();

      const grid = document.getElementById('modalPresetGrid');
      expect(grid.children.length).toBe(2);

      const closeBtn = document.getElementById('closePresetModalBtn');
      closeBtn.click();

      // Clean up
      window.labelList = originalLabelList;
      window.initializePresets();
    });

    it('should navigate using keyboard arrow keys and Enter/Space selections', async () => {
      const openBtn = document.getElementById('openPresetModalBtn');
      openBtn.click();
      await vi.runAllTimersAsync();

      const modal = document.getElementById('presetModal');
      const searchInput = document.getElementById('modalSearchInput');
      const grid = document.getElementById('modalPresetGrid');

      // Mock offsetTop to simulate 2 columns:
      // Row 0: cards 0, 1 (offsetTop = 100)
      // Row 1: card 2 (offsetTop = 200)
      Object.defineProperty(grid.children[0], 'offsetTop', { value: 100, configurable: true });
      Object.defineProperty(grid.children[1], 'offsetTop', { value: 100, configurable: true });
      Object.defineProperty(grid.children[2], 'offsetTop', { value: 200, configurable: true });

      function pressKey(keyName) {
        const event = new window.KeyboardEvent('keydown', { bubbles: true, key: keyName });
        document.activeElement.dispatchEvent(event);
      }

      // Focus should be on searchInput initially
      expect(document.activeElement).toBe(searchInput);

      // Press ArrowDown inside searchInput to focus first card
      pressKey('ArrowDown');
      expect(document.activeElement).toBe(grid.children[0]);

      // Press ArrowRight to focus second card
      pressKey('ArrowRight');
      expect(document.activeElement).toBe(grid.children[1]);

      // Press ArrowLeft to focus first card again
      pressKey('ArrowLeft');
      expect(document.activeElement).toBe(grid.children[0]);

      // Press ArrowUp inside first card to focus searchInput
      pressKey('ArrowUp');
      expect(document.activeElement).toBe(searchInput);

      // Focus first card again, then press ArrowDown to focus last card (clamped)
      pressKey('ArrowDown'); // focuses index 0
      pressKey('ArrowDown');
      expect(document.activeElement).toBe(grid.children[2]); // custom layout card

      // Press ArrowUp inside last card (index 2) to focus card at index 0 (cols = 2)
      pressKey('ArrowUp');
      expect(document.activeElement).toBe(grid.children[0]);

      // Press ArrowUp inside card at index 0 to focus searchInput (target < 0)
      pressKey('ArrowUp');
      expect(document.activeElement).toBe(searchInput);

      // Press Enter in searchInput to select the first card
      pressKey('Enter');
      expect(modal.classList.contains('active')).toBe(false);

      // Open again
      openBtn.click();
      await vi.runAllTimersAsync();

      // Press ArrowDown to focus first card, then Enter to select it
      pressKey('ArrowDown');
      pressKey('Enter');
      expect(modal.classList.contains('active')).toBe(false);

      // Open again
      openBtn.click();
      await vi.runAllTimersAsync();

      // Press ArrowDown to focus first card, then Space to select it
      pressKey('ArrowDown');
      pressKey(' ');
      expect(modal.classList.contains('active')).toBe(false);

      // Open again
      openBtn.click();
      await vi.runAllTimersAsync();

      // Press Escape inside presetModal to close it
      pressKey('Escape');
      expect(modal.classList.contains('active')).toBe(false);

      // Focus close button (not a card) and press ArrowRight (should do nothing/return early)
      const closeBtn = document.getElementById('closePresetModalBtn');
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      modal.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
      closeBtn.click();

      // Open again to focus search input and move to first card
      openBtn.click();
      await vi.runAllTimersAsync();
      pressKey('ArrowDown'); // focuses index 0

      // Press other key (like 'a') on card (should do nothing, covering implicit else)
      pressKey('a');
      expect(document.activeElement).toBe(grid.children[0]);

      // Search for "エーワン" to show exactly 1 preset card in the grid
      searchInput.value = 'エーワン';
      searchInput.dispatchEvent(new window.Event('input'));
      expect(grid.children.length).toBe(1);

      // Focus the single card and press ArrowRight (visibleCards.length > 1 evaluates to false)
      grid.children[0].focus();
      pressKey('ArrowRight');

      // Test when visibleCards is empty
      const originalLabelList = window.labelList;
      delete window.labelList;
      window.initializePresets();
      
      openBtn.click();
      await vi.runAllTimersAsync();
      
      // Press ArrowDown and Enter (should return early since visibleCards.length is 0)
      pressKey('ArrowDown');
      expect(document.activeElement).toBe(searchInput);
      pressKey('Enter');
      expect(modal.classList.contains('active')).toBe(true);

      // Clean up
      window.labelList = originalLabelList;
      window.initializePresets();
      closeBtn.click();
    });
  });
});

// labellist.jsの読み込みテスト
describe('Label List Presets', () => {
  it('should have a list of label presets', () => {
    require('../labellist.js');
    expect(global.labelList).toBeDefined();
    expect(global.labelList.length).toBeGreaterThan(0);
    expect(global.labelList[0].name).toBeDefined();
  });
});
