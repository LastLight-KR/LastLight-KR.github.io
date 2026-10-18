/* LastLight v25 native browser text layer.  It intentionally renders only text/controls;
 * Godot keeps cards, icons, hit areas, and all game interaction underneath it. */
(function () {
  'use strict';

  var ROOT_ID = 'lastlight-native-text';
  var Z_INDEX = 22;
  var INTERACTIVE_KINDS = { input: true, select: true, rich: true };
  var VALID_KINDS = { label: true, button: true, rich: true, input: true, select: true };
  var VALID_FAMILIES = { pretendard: true, gothic: true, serif: true };
  var state = {
    callback: null,
    root: null,
    items: new Map(),
    epoch: null,
    viewport: null,
    lastError: null,
    fontLoadStarted: false,
    // Captured once at the start of each render.  Geometry must use one consistent DPR
    // throughout a snapshot, and a changed DPR invalidates otherwise-stable entries.
    renderDpr: null
  };

  function fail(error) {
    // Never let a malformed bridge message stop game startup.
    state.lastError = error && String(error && error.message || error);
  }

  function finite(value, fallback) {
    value = Number(value);
    return Number.isFinite(value) ? value : fallback;
  }

  function integer(value, fallback) {
    value = Number(value);
    return Number.isInteger(value) ? value : fallback;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function actualDpr() {
    return Math.max(0.25, finite(window.devicePixelRatio, 1));
  }

  function dpr() {
    return state.renderDpr == null ? actualDpr() : state.renderDpr;
  }

  function snap(value) {
    var ratio = dpr();
    return Math.round(finite(value, 0) * ratio) / ratio;
  }

  function px(value) {
    // A number only reaches CSS after device-pixel-ratio snapping for geometry.
    return String(snap(value)) + 'px';
  }

  function rawPx(value) {
    return String(Math.max(0, finite(value, 0))) + 'px';
  }

  function rectFrom(value) {
    if (!Array.isArray(value) || value.length !== 4) return null;
    var x = finite(value[0], NaN);
    var y = finite(value[1], NaN);
    var w = finite(value[2], NaN);
    var h = finite(value[3], NaN);
    if (![x, y, w, h].every(Number.isFinite) || w < 0 || h < 0) return null;
    return [x, y, w, h];
  }

  function rectIntersection(a, b) {
    var left = Math.max(a[0], b[0]);
    var top = Math.max(a[1], b[1]);
    var right = Math.min(a[0] + a[2], b[0] + b[2]);
    var bottom = Math.min(a[1] + a[3], b[1] + b[3]);
    if (right <= left || bottom <= top) return null;
    return [left, top, right - left, bottom - top];
  }

  function exactRectCss(el, rect) {
    // Snap edges, rather than width alone, so adjacent clipped pieces do not leave a seam.
    var left = snap(rect[0]);
    var top = snap(rect[1]);
    var right = snap(rect[0] + rect[2]);
    var bottom = snap(rect[1] + rect[3]);
    setStyle(el, 'left', left + 'px');
    setStyle(el, 'top', top + 'px');
    setStyle(el, 'width', Math.max(0, right - left) + 'px');
    setStyle(el, 'height', Math.max(0, bottom - top) + 'px');
  }

  // Assigning an already-equal CSS value still dirties style in some engines.  Keep all
  // repeated render paths behind these guards; they also make partial snapshot updates cheap.
  function setStyle(el, name, value) {
    if (el.style[name] !== value) el.style[name] = value;
  }

  function setStyleProperty(el, name, value) {
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  }

  function setAttribute(el, name, value) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  function validColor(value) {
    value = String(value || '');
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';
  }

  function normalizeStyle(style) {
    style = style && typeof style === 'object' ? style : {};
    var padding = Array.isArray(style.padding) && style.padding.length === 4 ? style.padding : [0, 0, 0, 0];
    return {
      fontSize: clamp(finite(style.fontSize, 16), 1, 512),
      weight: clamp(finite(style.weight, 400), 100, 1000),
      color: validColor(style.color),
      fontHeight: clamp(finite(style.fontHeight, finite(style.fontSize, 16)), 1, 1024),
      lineGap: clamp(finite(style.lineGap, 0), -128, 512),
      align: style.align === 'center' || style.align === 'right' ? style.align : 'left',
      vertical: style.vertical === 'center' || style.vertical === 'bottom' ? style.vertical : 'top',
      padding: padding.map(function (n) { return Math.max(0, finite(n, 0)); }),
      wrap: !!style.wrap
    };
  }

  function normalizeItem(raw, index) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !VALID_KINDS[raw.kind]) return null;
    var rect = rectFrom(raw.rect);
    if (!rect || rect[2] === 0 || rect[3] === 0) return null;
    var regions = [];
    var incomingRegions = Array.isArray(raw.regions) ? raw.regions : [];
    for (var i = 0; i < incomingRegions.length; i += 1) {
      var source = incomingRegions[i] || {};
      var regionRect = rectFrom(source.rect);
      if (!regionRect) continue;
      // Godot normally emits intersections already.  The final intersection is a safe guard
      // against text escaping an item's own canvas rectangle.
      regionRect = rectIntersection(regionRect, rect);
      if (!regionRect) continue;
      var opacity = clamp(finite(source.opacity, 1), 0, 1);
      if (opacity <= 0) continue;
      regions.push({ key: String(i), rect: regionRect, opacity: opacity });
    }
    // Older/partial exporters can omit regions.  A whole-item region is safe and keeps the
    // bridge non-fatal, but proper v1 exports always supply the visible clipping pieces.
    if (!regions.length && !Array.isArray(raw.regions)) {
      regions.push({ key: '0', rect: rect.slice(), opacity: 1 });
    }

    var item = {
      id: raw.id,
      kind: raw.kind,
      rect: rect,
      regions: regions,
      style: normalizeStyle(raw.style),
      text: typeof raw.text === 'string' ? raw.text : String(raw.text == null ? '' : raw.text),
      lines: Array.isArray(raw.lines) ? raw.lines.map(function (line) { return String(line == null ? '' : line); }) : null,
      bbcode: typeof raw.bbcode === 'string' ? raw.bbcode : String(raw.bbcode == null ? '' : raw.bbcode),
      order: index
    };
    if (raw.kind === 'input') {
      var sourceInput = raw.input && typeof raw.input === 'object' ? raw.input : {};
      item.input = {
        value: typeof sourceInput.value === 'string' ? sourceInput.value : String(sourceInput.value == null ? '' : sourceInput.value),
        placeholder: typeof sourceInput.placeholder === 'string' ? sourceInput.placeholder : String(sourceInput.placeholder == null ? '' : sourceInput.placeholder),
        secret: !!sourceInput.secret,
        maxLength: integer(sourceInput.maxLength, -1),
        editable: sourceInput.editable !== false
      };
    }
    if (raw.kind === 'select') {
      var sourceSelect = raw.select && typeof raw.select === 'object' ? raw.select : {};
      var opts = Array.isArray(sourceSelect.options) ? sourceSelect.options : [];
      item.select = {
        selected: integer(sourceSelect.selected, -1),
        disabled: !!sourceSelect.disabled,
        options: opts.map(function (option) {
          option = option && typeof option === 'object' ? option : {};
          return {
            text: typeof option.text === 'string' ? option.text : String(option.text == null ? '' : option.text),
            disabled: !!option.disabled
          };
        })
      };
    }
    if (raw.kind === 'rich') {
      var sourceScroll = raw.scroll && typeof raw.scroll === 'object' ? raw.scroll : {};
      item.scroll = {
        ratio: clamp(finite(sourceScroll.ratio, 0), 0, 1),
        follow: !!sourceScroll.follow
      };
    }
    // `order` is deliberately excluded: it is reconciled independently without touching a
    // stable entry, while every value that can change this entry's native DOM is included.
    item.domSignature = JSON.stringify([
      item.kind, item.rect, item.regions, item.style,
      item.kind === 'rich' ? [item.bbcode, item.scroll] :
        (item.kind === 'input' ? item.input :
          (item.kind === 'select' ? item.select : [item.text, item.lines]))
    ]);
    return item;
  }

  function normalizeSnapshot(raw) {
    var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object' || data.version !== 1 || !Number.isInteger(data.epoch) || !Array.isArray(data.items)) {
      return null;
    }
    var viewport = data.viewport && typeof data.viewport === 'object' ? data.viewport : {};
    var items = [];
    var seen = Object.create(null);
    for (var i = 0; i < data.items.length; i += 1) {
      var item = normalizeItem(data.items[i], i);
      // IDs are the stable Godot instance IDs.  Duplicate IDs would make editing the wrong
      // native control unsafe, so later duplicates are ignored.
      if (item && !seen[item.id]) {
        seen[item.id] = true;
        items.push(item);
      }
    }
    return {
      version: 1,
      epoch: data.epoch,
      viewport: { w: Math.max(0, finite(viewport.w, 0)), h: Math.max(0, finite(viewport.h, 0)) },
      family: VALID_FAMILIES[data.family] ? data.family : 'pretendard',
      items: items
    };
  }

  function ensureRoot() {
    if (state.root && state.root.isConnected) return state.root;
    if (typeof document === 'undefined') return null;
    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'll-text-root';
      root.setAttribute('aria-label', '마지막 불빛 게임 텍스트');
      var parent = document.body || document.documentElement;
      if (!parent) return null;
      parent.appendChild(root);
    }
    setStyle(root, 'zIndex', String(Z_INDEX));
    state.root = root;
    prepareFont();
    return root;
  }

  function prepareFont() {
    if (state.fontLoadStarted || typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') return;
    state.fontLoadStarted = true;
    // The preloaded WOFF2 is normally ready quickly.  A failed explicit load is non-fatal:
    // CSS's Korean/system fallback remains a valid text-rendering path.
    try { Promise.resolve(document.fonts.load('400 15px LastLightUI')).catch(function () {}); } catch (_) {}
  }

  function familyCss(family) {
    if (family === 'gothic') return 'var(--ll-text-font-gothic, var(--ll-text-font))';
    if (family === 'serif') return 'var(--ll-text-font-serif, var(--ll-text-font))';
    return 'var(--ll-text-font)';
  }

  function verticalJustify(vertical) {
    return vertical === 'center' ? 'center' : (vertical === 'bottom' ? 'flex-end' : 'flex-start');
  }

  function baseContentStyle(regionState, item, region) {
    var el = regionState.content;
    var localRect = [item.rect[0] - region.rect[0], item.rect[1] - region.rect[1], item.rect[2], item.rect[3]];
    var style = item.style;
    var signature = JSON.stringify([localRect, style, state.family || 'pretendard', dpr()]);
    if (regionState.baseStyleSignature === signature) return;
    regionState.baseStyleSignature = signature;
    exactRectCss(el, localRect);
    setStyle(el, 'position', 'absolute');
    setStyle(el, 'boxSizing', 'border-box');
    setStyle(el, 'fontFamily', familyCss(state.family || 'pretendard'));
    setStyle(el, 'fontSize', rawPx(style.fontSize));
    setStyle(el, 'fontWeight', String(style.weight));
    setStyle(el, 'lineHeight', rawPx(style.fontHeight));
    setStyle(el, 'color', style.color);
    setStyle(el, 'textAlign', style.align);
    setStyle(el, 'padding', style.padding.map(rawPx).join(' '));
    setStyle(el, 'textShadow', 'none');
    setStyle(el, 'fontSynthesis', 'none');
  }

  function setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  function plainSignature(item) {
    return JSON.stringify([item.text, item.lines, item.style.wrap]);
  }

  function updatePlainContent(regionState, item, region) {
    var content = regionState.content;
    baseContentStyle(regionState, item, region);
    setStyle(content, 'pointerEvents', 'none');
    setStyle(content, 'display', 'flex');
    setStyle(content, 'flexDirection', 'column');
    setStyle(content, 'justifyContent', verticalJustify(item.style.vertical));
    setStyle(content, 'overflow', 'visible');

    var signature = plainSignature(item);
    if (regionState.contentSignature !== signature) {
      regionState.contentSignature = signature;
      var body = document.createElement('div');
      body.className = 'll-plain-body';
      body.style.width = '100%';
      body.style.minWidth = '0';
      body.style.textAlign = item.style.align;
      if (item.lines) {
        body.style.display = 'block';
        body.style.position = 'relative';
        body.style.whiteSpace = 'pre';
        for (var i = 0; i < item.lines.length; i += 1) {
          var line = document.createElement('div');
          line.className = 'll-plain-line';
          line.textContent = item.lines[i];
          body.appendChild(line);
        }
      } else {
        body.style.whiteSpace = item.style.wrap ? 'pre-wrap' : 'pre';
        body.style.overflowWrap = item.style.wrap ? 'break-word' : 'normal';
        body.style.wordBreak = item.style.wrap ? 'normal' : 'normal';
        body.textContent = item.text;
      }
      content.replaceChildren(body);
      regionState.body = body;
    }
    // Alignment and line geometry can change without changed text.
    if (regionState.body) {
      setStyle(regionState.body, 'textAlign', item.style.align);
      if (item.lines) {
        var totalHeight = item.lines.length ? item.lines.length * item.style.fontHeight + (item.lines.length - 1) * item.style.lineGap : 0;
        var lineLayoutSignature = JSON.stringify([item.style.align, item.style.fontHeight, item.style.lineGap, item.lines.length]);
        if (regionState.lineLayoutSignature !== lineLayoutSignature) {
          regionState.lineLayoutSignature = lineLayoutSignature;
          setStyle(regionState.body, 'height', rawPx(Math.max(0, totalHeight)));
          setStyle(regionState.body, 'position', 'relative');
          setStyle(regionState.body, 'display', 'block');
          Array.prototype.forEach.call(regionState.body.children, function (line, index) {
            setStyle(line, 'position', 'absolute');
            setStyle(line, 'left', '0');
            setStyle(line, 'right', '0');
            setStyle(line, 'top', rawPx(index * (item.style.fontHeight + item.style.lineGap)));
            setStyle(line, 'height', rawPx(item.style.fontHeight));
            setStyle(line, 'minHeight', rawPx(item.style.fontHeight));
            setStyle(line, 'lineHeight', rawPx(item.style.fontHeight));
          });
        }
      }
    }
  }

  function blockPointerFromGame(element) {
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart', 'touchend'].forEach(function (name) {
      element.addEventListener(name, function (event) { event.stopPropagation(); });
    });
  }

  function blockKeyboardFromGame(element, entry) {
    ['keydown', 'keyup', 'keypress', 'compositionstart', 'compositionupdate', 'compositionend'].forEach(function (name) {
      element.addEventListener(name, function (event) {
        if (name === 'compositionstart') entry.composing = true;
        if (name === 'compositionend') entry.composing = false;
        event.stopPropagation();
      });
    });
  }

  function isFocusedElement(element) {
    return typeof document !== 'undefined' && document.activeElement === element;
  }

  function updateFocusedFlag() {
    // The API exposes this through a getter.  Keeping this helper makes old browsers that
    // cannot define an accessor still receive a current boolean value.
    try { api.focused = !!(state.root && state.root.contains(document.activeElement) &&
      /^(INPUT|SELECT)$/.test(document.activeElement && document.activeElement.tagName)); } catch (_) {}
  }

  function send(entry, type, payload) {
    if (!entry || !entry.item || typeof state.callback !== 'function') return;
    var message = { type: type, id: entry.item.id, epoch: entry.epoch };
    if (payload && typeof payload === 'object') {
      Object.keys(payload).forEach(function (key) { message[key] = payload[key]; });
    }
    try { state.callback(JSON.stringify(message)); } catch (error) { fail(error); }
  }

  function attachInputEvents(entry, input) {
    blockPointerFromGame(input);
    blockKeyboardFromGame(input, entry);
    input.addEventListener('focus', function () {
      entry.focusedInput = input;
      updateFocusedFlag();
    });
    input.addEventListener('blur', function () {
      updateFocusedFlag();
      reconcileAfterBlur(entry);
    });
    input.addEventListener('input', function (event) {
      event.stopPropagation();
      entry.inputDraft = input.value;
      send(entry, 'input', { value: input.value });
    });
    input.addEventListener('keydown', function (event) {
      // Do not submit while Enter confirms an IME candidate.  Once compositionend has
      // occurred, the following ordinary Enter is deliberately kept and submitted.
      if (event.key === 'Enter' && !event.isComposing && !entry.composing) {
        event.preventDefault();
        send(entry, 'submit', { value: input.value });
      }
    });
  }

  function mountInput(entry, regionState) {
    var input = document.createElement('input');
    input.className = 'll-text-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', '게임 입력');
    attachInputEvents(entry, input);
    regionState.content = input;
    regionState.control = input;
    regionState.el.replaceChildren(input);
  }

  function secretCopy(value) {
    return value ? new Array(Array.from(value).length + 1).join('•') : '';
  }

  function updateInputControl(entry, regionState, item, region) {
    var input = regionState.control;
    baseContentStyle(regionState, item, region);
    input.style.pointerEvents = 'auto';
    var desiredType = item.input.secret ? 'password' : 'text';
    if (input.type !== desiredType) input.type = desiredType;
    if (input.placeholder !== item.input.placeholder) input.placeholder = item.input.placeholder;
    if (item.input.maxLength > 0) { if (input.maxLength !== item.input.maxLength) input.maxLength = item.input.maxLength; }
    else if (input.hasAttribute('maxlength')) input.removeAttribute('maxlength');
    if (input.readOnly !== !item.input.editable) input.readOnly = !item.input.editable;
    var ro = item.input.editable ? 'false' : 'true';
    if (input.getAttribute('aria-readonly') !== ro) input.setAttribute('aria-readonly', ro);
    // A render from Godot must not reset focus, selection/caret, or in-progress composition.
    if (!isFocusedElement(input) && !entry.composing) {
      if (input.value !== item.input.value) input.value = item.input.value;
      entry.inputDraft = null;
    }
  }

  function mountTextCopy(regionState, className) {
    var copy = document.createElement('div');
    copy.className = className;
    regionState.content = copy;
    regionState.control = null;
    regionState.el.replaceChildren(copy);
  }

  function updateInputCopy(entry, regionState, item, region) {
    var copy = regionState.content;
    baseContentStyle(regionState, item, region);
    copy.style.pointerEvents = 'none';
    copy.style.display = 'flex';
    copy.style.flexDirection = 'column';
    copy.style.justifyContent = verticalJustify(item.style.vertical);
    copy.style.whiteSpace = item.style.wrap ? 'pre-wrap' : 'pre';
    var actualValue = isFocusedElement(entry.focusedInput) && entry.inputDraft != null ? entry.inputDraft : item.input.value;
    var visibleValue = actualValue || item.input.placeholder;
    setText(copy, item.input.secret && actualValue ? secretCopy(actualValue) : visibleValue);
  }

  function selectOptionsSignature(item) {
    return JSON.stringify(item.select.options);
  }

  function attachSelectEvents(entry, select) {
    blockPointerFromGame(select);
    blockKeyboardFromGame(select, entry);
    select.addEventListener('focus', function () {
      entry.focusedSelect = select;
      updateFocusedFlag();
    });
    select.addEventListener('blur', function () {
      updateFocusedFlag();
      reconcileAfterBlur(entry);
    });
    select.addEventListener('change', function (event) {
      event.stopPropagation();
      entry.selectDraft = select.selectedIndex;
      send(entry, 'select', { value: select.selectedIndex });
    });
  }

  function mountSelect(entry, regionState) {
    var select = document.createElement('select');
    select.className = 'll-text-select';
    select.setAttribute('aria-label', '게임 항목 선택');
    attachSelectEvents(entry, select);
    regionState.content = select;
    regionState.control = select;
    regionState.el.replaceChildren(select);
  }

  function fillSelectOptions(select, item) {
    select.replaceChildren();
    item.select.options.forEach(function (option) {
      var node = document.createElement('option');
      node.textContent = option.text;
      node.disabled = option.disabled;
      select.appendChild(node);
    });
  }

  function updateSelectControl(entry, regionState, item, region) {
    var select = regionState.control;
    baseContentStyle(regionState, item, region);
    select.style.pointerEvents = 'auto';
    var rgb = item.style.color.slice(1).match(/../g).map(function (v) { return parseInt(v, 16); });
    var lightText = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) > 140;
    select.style.setProperty('--ll-option-bg', lightText ? '#1d282c' : '#eff5ef');
    select.style.setProperty('--ll-option-color', item.style.color);
    select.disabled = item.select.disabled;
    var optionsSignature = selectOptionsSignature(item);
    var focused = isFocusedElement(select);
    // Do not close a native select popup / replace its focused DOM while Godot is rendering.
    if (!focused && regionState.optionsSignature !== optionsSignature) {
      fillSelectOptions(select, item);
      regionState.optionsSignature = optionsSignature;
    }
    if (!focused) {
      var index = item.select.selected;
      if (index >= 0 && index < select.options.length) select.selectedIndex = index;
      else select.selectedIndex = -1;
      entry.selectDraft = null;
    }
  }

  function selectedText(entry, item) {
    var index = isFocusedElement(entry.focusedSelect) && Number.isInteger(entry.selectDraft) ? entry.selectDraft : item.select.selected;
    return index >= 0 && index < item.select.options.length ? item.select.options[index].text : '';
  }

  function updateSelectCopy(entry, regionState, item, region) {
    var copy = regionState.content;
    baseContentStyle(regionState, item, region);
    copy.style.pointerEvents = 'none';
    copy.style.display = 'flex';
    copy.style.flexDirection = 'column';
    copy.style.justifyContent = verticalJustify(item.style.vertical);
    copy.style.whiteSpace = 'pre';
    setText(copy, selectedText(entry, item));
  }

  function appendSafeRichText(target, bbcode) {
    // Parse only the compact BBCode subset exported by the game.  No HTML is parsed or inserted.
    var stack = [{ name: 'root', node: target }];
    var pieces = String(bbcode || '').split(/(\[[^\]\r\n]*\])/g);
    function current() { return stack[stack.length - 1].node; }
    function close(name) {
      for (var i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].name === name) {
          stack.length = i;
          return;
        }
      }
    }
    for (var p = 0; p < pieces.length; p += 1) {
      var piece = pieces[p];
      if (!piece) continue;
      if (piece.charAt(0) !== '[' || piece.charAt(piece.length - 1) !== ']') {
        current().appendChild(document.createTextNode(piece));
        continue;
      }
      var raw = piece.slice(1, -1).trim();
      var closeMatch = raw.match(/^\/(b|i|u|s|color|url|center|right|font_size)$/i);
      if (closeMatch) {
        close(closeMatch[1].toLowerCase());
        continue;
      }
      if (/^br\s*\/?$/i.test(raw)) {
        current().appendChild(document.createElement('br'));
        continue;
      }
      var match = raw.match(/^(b|i|u|s|color|url|center|right|font_size)(?:\s*=\s*([^\]]*))?$/i);
      if (!match) {
        if (raw === 'lb') current().appendChild(document.createTextNode('['));
        else if (raw === 'rb') current().appendChild(document.createTextNode(']'));
        else if (/^(F|D|C|B|A|S|SS|GM|[FDBCAS]{1,2}등급|능력 강화|의약품|긍정 효과|완치|전투|부활|음식|음료|회복|재료|무기|방어구|도구|기타)$/.test(raw)) current().appendChild(document.createTextNode(piece));
        continue;
      }
      var name = match[1].toLowerCase();
      var argument = (match[2] || '').trim();
      var node = document.createElement(name === 'url' ? 'a' : 'span');
      if (name === 'b') node.style.fontWeight = '600';
      if (name === 'i') node.style.fontStyle = 'italic';
      if (name === 'u') node.style.textDecoration = 'underline';
      if (name === 's') node.style.textDecoration = 'line-through';
      if (name === 'color') {
        // Godot colors commonly use #RRGGBB/#RRGGBBAA.  Do not accept CSS functions/URLs.
        if (/^#[0-9a-f]{3,8}$/i.test(argument)) node.style.color = argument;
      }
      if (name === 'center' || name === 'right') {
        node.style.display = 'block';
        node.style.textAlign = name;
      }
      if (name === 'font_size') {
        var size = clamp(finite(argument, NaN), 1, 512);
        if (Number.isFinite(size)) node.style.fontSize = size + 'px';
      }
      if (name === 'url') {
        node.className = 'll-rich-link';
        node.setAttribute('data-ll-meta', argument);
        node.setAttribute('role', 'link');
        node.tabIndex = 0;
      }
      current().appendChild(node);
      stack.push({ name: name, node: node });
    }
  }

  function attachRichEvents(entry, rich) {
    blockPointerFromGame(rich);
    rich.addEventListener('wheel', function (event) { event.stopPropagation(); }, { passive: true });
    rich.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('.ll-rich-link') : null;
      if (!target || !rich.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      var meta = target.getAttribute('data-ll-meta') || target.textContent || '';
      send(entry, 'meta', { value: meta });
    });
    rich.addEventListener('keydown', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('.ll-rich-link') : null;
      if (target && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
        send(entry, 'meta', { value: target.getAttribute('data-ll-meta') || target.textContent || '' });
      }
    });
    rich.addEventListener('scroll', function (event) {
      event.stopPropagation();
      if (entry.settingScroll) return;
      if (Number.isFinite(entry.programmaticScrollTarget)) {
        if (Math.abs(rich.scrollTop - entry.programmaticScrollTarget) < 1) {
          entry.programmaticScrollTarget = NaN;
          syncRichCopies(entry, rich.scrollTop);
          return;
        }
        entry.programmaticScrollTarget = NaN;
      }
      var max = Math.max(0, rich.scrollHeight - rich.clientHeight);
      var ratio = max > 0 ? clamp(rich.scrollTop / max, 0, 1) : 0;
      entry.userAtBottom = max <= 1 || rich.scrollTop >= max - 2;
      entry.lastSentRatio = ratio;
      syncRichCopies(entry, rich.scrollTop);
      send(entry, 'scroll', { value: ratio });
    }, { passive: true });
  }

  function mountRich(entry, regionState, interactive) {
    var rich = document.createElement('div');
    rich.className = interactive ? 'll-rich' : 'll-rich-copy';
    if (interactive) {
      rich.setAttribute('aria-label', '게임 기록');
      attachRichEvents(entry, rich);
      regionState.control = rich;
    } else {
      rich.setAttribute('aria-hidden', 'true');
      regionState.control = null;
    }
    var body = document.createElement('div');
    body.className = 'll-rich-body';
    rich.appendChild(body);
    regionState.content = rich;
    regionState.body = body;
    regionState.el.replaceChildren(rich);
  }

  function updateRichMarkup(regionState, item) {
    var signature = item.bbcode;
    if (regionState.contentSignature === signature) return false;
    regionState.contentSignature = signature;
    regionState.body.replaceChildren();
    appendSafeRichText(regionState.body, item.bbcode);
    return true;
  }

  function updateRichContent(entry, regionState, item, region, interactive) {
    var rich = regionState.content;
    baseContentStyle(regionState, item, region);
    rich.style.pointerEvents = interactive ? 'auto' : 'none';
    rich.style.whiteSpace = 'pre-wrap';
    rich.style.overflowWrap = 'break-word';
    rich.style.wordBreak = 'normal';
    rich.style.userSelect = interactive ? 'text' : 'none';
    rich.style.overflowY = interactive ? 'auto' : 'hidden';
    rich.style.overflowX = 'hidden';
    rich.style.overscrollBehavior = 'contain';
    if (!interactive) rich.style.position = 'absolute';
    regionState.body.style.lineHeight = rawPx(Math.max(item.style.fontHeight + item.style.lineGap, item.style.fontSize * 1.5));
    regionState.body.style.textAlign = item.style.align;
    var changed = updateRichMarkup(regionState, item);
    if (!interactive) {
      regionState.body.style.position = 'relative';
      regionState.body.style.top = '-' + finite(entry.richScrollTop, 0) + 'px';
    }
    return changed;
  }

  function syncRichCopies(entry, scrollTop) {
    entry.richScrollTop = Math.max(0, finite(scrollTop, 0));
    entry.regions.forEach(function (regionState) {
      if (regionState.mode === 'rich-copy' && regionState.body) {
        regionState.body.style.top = '-' + entry.richScrollTop + 'px';
      }
    });
  }

  function setRichScroll(entry, rich, item, changed) {
    var max = Math.max(0, rich.scrollHeight - rich.clientHeight);
    var currentRatio = max ? clamp(rich.scrollTop / max, 0, 1) : 0;
    var sourceRatio = item.scroll.ratio;
    var shouldFollow = item.scroll.follow && (entry.userAtBottom === true || max <= 1 || (changed && currentRatio >= 0.995));
    // If the snapshot is only an echo of our own scroll callback, leave native scroll alone.
    var echo = Number.isFinite(entry.lastSentRatio) && Math.abs(sourceRatio - entry.lastSentRatio) < 0.004;
    if (shouldFollow) {
      entry.settingScroll = true;
      rich.scrollTop = max;
      entry.settingScroll = false;
      entry.programmaticScrollTarget = rich.scrollTop;
      entry.userAtBottom = true;
    } else if (!echo && !isFocusedElement(rich)) {
      entry.settingScroll = true;
      rich.scrollTop = sourceRatio * max;
      entry.settingScroll = false;
      entry.programmaticScrollTarget = rich.scrollTop;
      entry.userAtBottom = max <= 1 || rich.scrollTop >= max - 2;
    }
    syncRichCopies(entry, rich.scrollTop);
  }

  function makeRegion(entry, key) {
    var el = document.createElement('div');
    el.className = 'll-text-region';
    el.dataset.regionKey = key;
    entry.el.appendChild(el);
    return { key: key, el: el, mode: '', content: null, control: null, body: null, contentSignature: null, optionsSignature: null };
  }

  function disposeRegions(entry) {
    entry.regions.forEach(function (region) { region.el.remove(); });
    entry.regions.clear();
  }

  function removeEntry(id) {
    var entry = state.items.get(id);
    if (!entry) return;
    entry.el.remove();
    state.items.delete(id);
  }

  function makeEntry(item) {
    var el = document.createElement('div');
    el.className = 'll-text-item';
    el.dataset.itemId = item.id;
    return {
      item: item,
      epoch: state.epoch,
      el: el,
      kind: item.kind,
      regions: new Map(),
      activeKey: null,
      inputDraft: null,
      selectDraft: null,
      composing: false,
      focusedInput: null,
      focusedSelect: null,
      userAtBottom: item.kind === 'rich' ? item.scroll.ratio >= 0.995 : false,
      richScrollTop: 0,
      lastSentRatio: NaN,
      programmaticScrollTarget: NaN,
      settingScroll: false
    };
  }

  function chooseActiveKey(entry, item) {
    if (!INTERACTIVE_KINDS[item.kind]) return null;
    var focusedKey = null;
    entry.regions.forEach(function (region, key) {
      if (region.control && isFocusedElement(region.control)) focusedKey = key;
    });
    if (focusedKey && item.regions.some(function (region) { return region.key === focusedKey && region.opacity >= 0.95; })) return focusedKey;
    var retained = item.regions.some(function (region) { return region.key === entry.activeKey && region.opacity >= 0.95; });
    if (retained) return entry.activeKey;
    var biggest = null;
    item.regions.forEach(function (region) {
      if (region.opacity < 0.95) return;
      if (!biggest || region.rect[2] * region.rect[3] > biggest.rect[2] * biggest.rect[3]) biggest = region;
    });
    return biggest ? biggest.key : null;
  }

  function modeFor(item, interactive) {
    if (item.kind === 'input') return interactive ? 'input-control' : 'input-copy';
    if (item.kind === 'select') return interactive ? 'select-control' : 'select-copy';
    if (item.kind === 'rich') return interactive ? 'rich-control' : 'rich-copy';
    return 'plain';
  }

  function mountMode(entry, regionState, mode) {
    regionState.mode = mode;
    regionState.baseStyleSignature = null;
    regionState.lineGeometrySignature = null;
    regionState.contentSignature = null;
    regionState.optionsSignature = null;
    if (mode === 'plain') {
      var content = document.createElement('div');
      content.className = 'll-text-content';
      regionState.content = content;
      regionState.control = null;
      regionState.el.replaceChildren(content);
    } else if (mode === 'input-control') {
      mountInput(entry, regionState);
    } else if (mode === 'input-copy') {
      mountTextCopy(regionState, 'll-text-copy ll-input-copy');
    } else if (mode === 'select-control') {
      mountSelect(entry, regionState);
    } else if (mode === 'select-copy') {
      mountTextCopy(regionState, 'll-text-copy ll-select-copy');
    } else if (mode === 'rich-control') {
      mountRich(entry, regionState, true);
    } else if (mode === 'rich-copy') {
      mountRich(entry, regionState, false);
    }
  }

  function reconcileAfterBlur(entry) {
    Promise.resolve().then(function () {
      if (state.items.get(entry.item.id) !== entry || !entry.el.isConnected) return;
      try { updateEntry(entry, entry.item, true); } catch (error) { fail(error); }
    });
  }

  function updateEntry(entry, item, force) {
    var signature = JSON.stringify([item, state.family, dpr()]);
    entry.item = item;
    entry.epoch = state.epoch;
    if (!force && entry.renderSignature === signature) return;
    entry.renderSignature = signature;
    if (entry.kind !== item.kind) {
      disposeRegions(entry);
      entry.kind = item.kind;
      entry.activeKey = null;
      entry.inputDraft = null;
      entry.selectDraft = null;
    }
    entry.item = item;
    entry.epoch = state.epoch;
    if (entry.el.dataset.itemId !== item.id) entry.el.dataset.itemId = item.id;
    var activeKey = chooseActiveKey(entry, item);
    entry.activeKey = activeKey;
    var wanted = Object.create(null);
    var richControl = null;
    var richChanged = false;

    item.regions.forEach(function (region) {
      wanted[region.key] = true;
      var regionState = entry.regions.get(region.key);
      if (!regionState) {
        regionState = makeRegion(entry, region.key);
        entry.regions.set(region.key, regionState);
      }
      exactRectCss(regionState.el, region.rect);
      regionState.el.style.position = 'absolute';
      regionState.el.style.overflow = 'hidden';
      regionState.el.style.opacity = String(region.opacity);
      var interactive = INTERACTIVE_KINDS[item.kind] && region.key === activeKey && region.opacity >= 0.95;
      regionState.el.classList.toggle('ll-interactive-region', interactive);
      regionState.el.style.pointerEvents = interactive ? 'auto' : 'none';
      var mode = modeFor(item, interactive);
      if (regionState.mode !== mode || !regionState.content) mountMode(entry, regionState, mode);

      if (mode === 'plain') {
        updatePlainContent(regionState, item, region);
      } else if (mode === 'input-control') {
        entry.focusedInput = regionState.control;
        updateInputControl(entry, regionState, item, region);
      } else if (mode === 'input-copy') {
        updateInputCopy(entry, regionState, item, region);
      } else if (mode === 'select-control') {
        entry.focusedSelect = regionState.control;
        updateSelectControl(entry, regionState, item, region);
      } else if (mode === 'select-copy') {
        updateSelectCopy(entry, regionState, item, region);
      } else if (mode === 'rich-control' || mode === 'rich-copy') {
        var changed = updateRichContent(entry, regionState, item, region, mode === 'rich-control');
        richChanged = richChanged || changed;
        if (mode === 'rich-control') richControl = regionState.control;
      }
    });

    entry.regions.forEach(function (regionState, key) {
      if (!wanted[key]) {
        regionState.el.remove();
        entry.regions.delete(key);
      }
    });
    if (richControl) setRichScroll(entry, richControl, item, richChanged);
  }

  function render(raw) {
    try {
      var snapshot = normalizeSnapshot(raw);
      if (!snapshot) return false;
      var root = ensureRoot();
      if (!root) return false;
      state.epoch = snapshot.epoch;
      state.viewport = snapshot.viewport;
      state.family = snapshot.family;
      state.renderDpr = actualDpr();
      if (root.dataset.family !== snapshot.family) root.dataset.family = snapshot.family;
      // This clips only to the Godot canvas size.  It never scales or changes browser zoom.
      setStyle(root, 'width', snapshot.viewport.w > 0 ? px(snapshot.viewport.w) : '');
      setStyle(root, 'height', snapshot.viewport.h > 0 ? px(snapshot.viewport.h) : '');
      var present = Object.create(null);
      var renderFailed = false;
      snapshot.items.forEach(function (item) {
        present[item.id] = true;
        var entry = state.items.get(item.id);
        if (!entry) {
          entry = makeEntry(item);
          state.items.set(item.id, entry);
          root.appendChild(entry.el);
        }
        try {
          updateEntry(entry, item);
        } catch (error) {
          renderFailed = true;
          fail(error);
        }
      });
      Array.from(state.items.keys()).forEach(function (id) {
        if (!present[id]) removeEntry(id);
      });
      // Keep painter order without re-appending every stable element.  Re-appending an
      // ancestor of a focused input can blur it in Chromium, so an unchanged order is left
      // entirely untouched.
      var previous = null;
      snapshot.items.forEach(function (item) {
        var entry = state.items.get(item.id);
        if (!entry) return;
        var expected = previous ? previous.nextElementSibling : root.firstElementChild;
        if (entry.el !== expected) root.insertBefore(entry.el, expected || null);
        previous = entry.el;
      });
      updateFocusedFlag();
      return !renderFailed;
    } catch (error) {
      fail(error);
      return false;
    }
  }

  function clear() {
    try {
      state.items.forEach(function (entry) { entry.el.remove(); });
      state.items.clear();
      state.epoch = null;
      updateFocusedFlag();
    } catch (error) {
      fail(error);
    }
  }

  function bind(callback) {
    // Rebinding is normal after a Godot reload.  A non-function explicitly unbinds.
    state.callback = typeof callback === 'function' ? callback : null;
  }

  function debugSnapshot() {
    var entries = [];
    state.items.forEach(function (entry) {
      entries.push({
        id: entry.item.id,
        kind: entry.kind,
        regions: entry.regions.size,
        activeRegion: entry.activeKey,
        epoch: entry.epoch
      });
    });
    var visibleItemCount = entries.filter(function (entry) { return entry.regions > 0; }).length;
    return {
      epoch: state.epoch,
      itemCount: state.items.size,
      visibleItemCount: visibleItemCount,
      visibleitemcount: visibleItemCount,
      items: entries,
      lastError: state.lastError
    };
  }

  var api = {
    available: true,
    bind: bind,
    render: render,
    clear: clear,
    focused: false,
    debugSnapshot: debugSnapshot,
    get itemCount() { return state.items.size; }
  };
  // The parent checks a property, not a method.  The getter stays correct even when focus
  // changes without a new snapshot (for example, clicking the canvas).
  try {
    Object.defineProperty(api, 'focused', {
      enumerable: true,
      configurable: false,
      get: function () {
        return !!(state.root && typeof document !== 'undefined' &&
          state.root.contains(document.activeElement) &&
          /^(INPUT|SELECT)$/.test(document.activeElement && document.activeElement.tagName));
      }
    });
  } catch (_) {}

  // Start font matching as soon as the script is evaluated; render still remains fully
  // functional with the CSS fallback if the preloaded file is unavailable.
  prepareFont();
  window.LastLightTextUI = api;
}());
