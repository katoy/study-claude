import { describe, it, expect, vi } from 'vitest';
import { initCharCounter } from '../../../src/ui/charCounter.js';

describe('charCounter (initCharCounter)', () => {
  it('onLengthChange コールバックが指定されていない場合でも動作すること', () => {
    const input = document.createElement('input');
    const counter = document.createElement('span');

    input.value = 'hello';
    initCharCounter(input, counter, 10);

    expect(counter.textContent).toBe('5 / 10');

    // 値を変更して input イベントを発火
    input.value = 'hello world';
    input.dispatchEvent(new Event('input'));

    expect(counter.textContent).toBe('11 / 10');
  });

  it('onLengthChange コールバックが指定されている場合に呼び出されること', () => {
    const input = document.createElement('input');
    const counter = document.createElement('span');
    const callback = vi.fn();

    input.value = 'test';
    initCharCounter(input, counter, 5, callback);

    expect(counter.textContent).toBe('4 / 5');
    expect(callback).toHaveBeenCalledWith(4, true);

    input.value = 'tested';
    input.dispatchEvent(new Event('input'));

    expect(counter.textContent).toBe('6 / 5');
    expect(callback).toHaveBeenCalledWith(6, false);
  });
});
