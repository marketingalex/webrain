const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const state = { raw: JSON.stringify({ original: 1 }), blocked: false, unreadable: false };
  const document = { activeElement: null };
  function node() {
    return {
      children: [], events: {}, attrs: {}, style: {}, offsetParent: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { this.events[k] = fn; },
      appendChild(n) { this.children.push(n); n.parent = this; },
      prepend(n) { this.children.unshift(n); n.parent = this; },
      remove() { this.parent.children = this.parent.children.filter(n => n !== this); },
      focus() { document.activeElement = this; },
      querySelectorAll() { return []; }, querySelector() { return null; }
    };
  }
  document.body = node();
  const root = node();
  const trigger = node(); trigger.focus();
  const close = node();
  const body = node();
  const overlay = node();
  overlay.querySelector = sel => sel === '.pop__body' ? body : sel === '[data-fechar]' ? close : null;
  overlay.querySelectorAll = sel => sel === '[data-fechar]' || sel.startsWith('a[href]') ? [close] : [];
  document.getElementById = () => root;
  document.createElement = () => node();
  const ctx = { window: {}, document, localStorage: {
    getItem() { if (state.unreadable) throw new Error('blocked'); return state.raw; },
    setItem(k, v) { if (state.blocked) throw new Error('quota'); state.raw = v; }
  }, setTimeout() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/ui.js'), 'utf8'), ctx);
  const WB = ctx.window.WB;
  WB.ligarTabelas = () => {};
  return { WB, state, document, trigger, close, overlay, body, popup() {
    document.createElement = () => overlay;
    return WB.abrirPopup({ titulo: 'Leitura', corpo: '<p>Texto</p>' });
  } };
}

test('Falha de gravação avisa uma vez e preserva alterações em memória', () => {
  const { WB, state, document } = setup();
  state.blocked = true;
  assert.equal(WB.store.set('novo', 2), false);
  WB.store.push('lista', 'a'); WB.store.push('lista', 'b');
  assert.equal(WB.store.get('novo'), 2);
  assert.deepEqual(Array.from(WB.store.get('lista')), ['b', 'a']);
  assert.equal(JSON.parse(state.raw).novo, undefined);
  assert.equal(document.body.children.length, 1);
  assert.equal(document.body.children[0].attrs.role, 'alert');
  assert.match(document.body.children[0].textContent, /perdidas/);
});

test('Nova tentativa recupera todas as gravações e preserva outras chaves', () => {
  const { WB, state, document } = setup();
  state.blocked = true;
  WB.store.set('a', 2); WB.store.set('b', 3);
  state.raw = JSON.stringify({ original: 1, outraAba: 4 });
  state.blocked = false;
  document.body.children[0].children[0].events.click();
  assert.deepEqual(JSON.parse(state.raw), { original: 1, outraAba: 4, a: 2, b: 3 });
  assert.equal(document.body.children.length, 0);
});

test('Leitura bloqueada não sobrescreve o armazenamento e recupera ao liberar', () => {
  const { WB, state } = setup();
  state.unreadable = true;
  assert.equal(WB.store.set('a', 2), false);
  assert.equal(WB.store.get('a'), 2);
  assert.deepEqual(JSON.parse(state.raw), { original: 1 });
  state.unreadable = false;
  assert.equal(WB.store.set('b', 3), true);
  assert.deepEqual(JSON.parse(state.raw), { original: 1, a: 2, b: 3 });
});

test('Dados inválidos não são destruídos por gravações automáticas', () => {
  const { WB, state } = setup();
  for (const raw of ['null', '[]', '{invalido']) {
    state.raw = raw;
    assert.equal(WB.store.set('a', 2), false);
    assert.equal(state.raw, raw);
  }
});

test('Popup de leitura recebe foco, prende Tab e fecha com Escape devolvendo foco', () => {
  const { popup, document, close, overlay, trigger } = setup();
  popup();
  assert.equal(document.activeElement, close);
  for (const shiftKey of [false, true]) {
    let prevented = false;
    overlay.events.keydown({ key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(document.activeElement, close);
  }
  overlay.events.keydown({ key: 'Escape', stopPropagation() {} });
  assert.equal(document.activeElement, trigger);
  assert.equal(document.body.style.overflow, '');
});

test('Campo oculto não impede o fallback de foco do popup', () => {
  const { popup, body, document, close } = setup();
  body.querySelectorAll = () => [{ offsetParent: null, focus() { throw new Error('oculto'); } }];
  popup();
  assert.equal(document.activeElement, close);
});

test('Rotas preservam escapes inválidos sem quebrar acentos ou barras codificadas', () => {
  const { WB } = setup();
  for (const term of ['%', '%ZZ', '%E0%A4%A']) {
    assert.deepEqual(Array.from(WB.routeSegments('#/busca/' + term)), ['busca', term]);
  }
  assert.deepEqual(Array.from(WB.routeSegments('#/busca/a%C3%A7%C3%A3o%2F2026')), ['busca', 'ação/2026']);
});

test('Campo numérico preserva zero ao abrir uma edição', () => {
  const { WB } = setup();
  assert.match(WB.campo({ nome: 'quantidade', tipo: 'number', valor: 0 }), /value="0"/);
  assert.match(WB.campo({ nome: 'quantidade', tipo: 'number', valor: null }), /value=""/);
});

test('Demanda aprovada não recebe aviso de atraso', () => {
  const { WB } = setup();
  WB.hoje = new Date(2026, 8, 23);
  const html = WB.chipPrazo({ status: 'aprovada', prazo: '2026-09-01' });
  assert.match(html, /Aprovada/);
  assert.doesNotMatch(html, /Atrasada/);
  assert.match(WB.chipPrazo({ status: 'andamento', prazo: '2026-09-01' }), /Atrasada/);
});

test('Tab ignora controles desabilitados no final do modal', () => {
  const { popup, document, close, overlay } = setup();
  popup();
  const disabled = { disabled: true, offsetParent: {}, focus() { throw new Error('desabilitado'); } };
  overlay.querySelectorAll = () => [close, disabled];
  let prevented = false;
  overlay.events.keydown({ key: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, close);
});

test('Validação respeita formatos, limites e campos desabilitados', () => {
  const { WB } = setup();
  WB.toast = () => {};
  let focused;
  const field = (props) => Object.assign({ value: '', attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
    focus() { focused = this; }
  }, props);
  const email = field({ value: 'sem-arroba', validity: { valid: false } });
  const amount = field({ value: '-1', validity: { valid: false } });
  const disabled = field({ required: true, disabled: true });
  const required = field({ required: true, value: '   ', validity: { valid: true } });
  const fields = [disabled, email, amount, required];
  const form = { querySelectorAll: selector => selector === 'input, select, textarea' ? fields : [] };
  assert.equal(WB.validar(form), false);
  assert.equal(focused, email);
  assert.equal(disabled.attrs['aria-invalid'], undefined);
  assert.equal(required.attrs['aria-invalid'], 'true');
  email.validity.valid = true; amount.validity.valid = true; required.value = 'Nome';
  assert.equal(WB.validar(form), true);
  assert.equal(email.attrs['aria-invalid'], 'false');
});
