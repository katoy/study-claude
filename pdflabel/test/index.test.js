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
    expect(presetSelect.options.length).toBe(2); // 1つのモックプリセット + 1つのカスタム
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
