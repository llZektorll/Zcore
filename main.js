'use strict';

const {
  Plugin, ItemView, PluginSettingTab, Setting, Modal, Notice, TFile, TFolder,
  getAllTags, moment,
} = require('obsidian');

const VIEW_TYPE = 'zcore-dashboard';
const COLS = 12;

/* ------------------------------------------------------------------ registry */

const WIDGETS = {
  uplink: {
    name: 'Vault uplink', desc: 'Headline counts. Every tile can be scoped on its own.',
    size: { w: 12, h: 4 },
    options: [
      { key: 'tiles', type: 'tiles', name: 'Tiles', def: [
        { id: 'notes', label: 'Notes', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'words', label: 'Words', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'links', label: 'Links', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'tags', label: 'Tags', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'open', label: 'Open tasks', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'done', label: 'Completed', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'orphans', label: 'Orphans', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
        { id: 'unresolved', label: 'Unresolved', enabled: true, scopeMode: 'inherit', include: '', exclude: '' },
      ] },
    ],
  },
  capture: {
    name: 'Quick capture', desc: 'Append a line to an inbox note.',
    size: { w: 4, h: 4 },
    options: [
      { key: 'target', type: 'text', name: 'Target note', desc: 'Created if missing.', def: 'Inbox.md' },
      { key: 'prefix', type: 'dropdown', name: 'Line prefix', def: 'bullet',
        choices: { none: 'None', bullet: 'Bullet (-)', task: 'Task (- [ ])' } },
      { key: 'timestamp', type: 'toggle', name: 'Prepend time', desc: 'Adds HH:mm before the text.', def: false },
      { key: 'openAfter', type: 'toggle', name: 'Open note after saving', def: false },
    ],
  },
  pomodoro: {
    name: 'Pomodoro timer', desc: 'Focus timer with work, short and long breaks.',
    size: { w: 4, h: 5 },
    options: [
      { key: 'work', type: 'number', name: 'Focus minutes', def: 25, min: 5, max: 90 },
      { key: 'shortBreak', type: 'number', name: 'Short break minutes', def: 5, min: 1, max: 30 },
      { key: 'longBreak', type: 'number', name: 'Long break minutes', def: 15, min: 5, max: 60 },
      { key: 'cycles', type: 'number', name: 'Focus rounds before a long break', def: 4, min: 2, max: 8 },
      { key: 'autoStart', type: 'toggle', name: 'Start the next phase automatically', def: false },
      { key: 'notify', type: 'toggle', name: 'Notify when a phase ends', def: true },
      { key: 'logTo', type: 'text', name: 'Log finished rounds to', desc: 'Note path. Leave empty to disable.', def: '' },
    ],
  },
  feed: {
    name: 'Activity feed', desc: 'Most recently modified files.',
    size: { w: 4, h: 6 },
    options: [
      { key: 'limit', type: 'number', name: 'Rows', def: 8, min: 3, max: 30 },
      { key: 'showFolder', type: 'toggle', name: 'Show folder', def: true },
    ],
  },
  recent: {
    name: 'Recent notes', desc: 'Notes modified within a window.',
    size: { w: 4, h: 5 },
    options: [
      { key: 'days', type: 'number', name: 'Days back', def: 7, min: 1, max: 90 },
      { key: 'limit', type: 'number', name: 'Rows', def: 10, min: 3, max: 40 },
      { key: 'sortBy', type: 'dropdown', name: 'Sort by', def: 'mtime',
        choices: { mtime: 'Modified', ctime: 'Created' } },
    ],
  },
  tasks: {
    name: 'Open tasks', desc: 'Unchecked checkboxes across the scope.',
    size: { w: 4, h: 6 },
    options: [
      { key: 'limit', type: 'number', name: 'Rows', def: 12, min: 3, max: 60 },
      { key: 'showSource', type: 'toggle', name: 'Show source note', def: true },
      { key: 'hideEmpty', type: 'toggle', name: 'Hide if nothing is open', def: false },
    ],
  },
  agenda: {
    name: 'Agenda', desc: 'Daily notes for the current week.',
    size: { w: 4, h: 5 },
    options: [
      { key: 'folder', type: 'folder', name: 'Daily notes folder', def: 'Daily' },
      { key: 'format', type: 'text', name: 'Filename format', def: 'YYYY-MM-DD' },
      { key: 'template', type: 'text', name: 'Template note', desc: 'Optional. Used when creating a day.', def: '' },
    ],
  },
  hourly: {
    name: 'Hourly activity', desc: 'Files touched per hour.',
    size: { w: 4, h: 4 },
    options: [{ key: 'hours', type: 'number', name: 'Hours', def: 12, min: 6, max: 24 }],
  },
  folders: {
    name: 'Folder distribution', desc: 'Note count per folder.',
    size: { w: 4, h: 5 },
    options: [
      { key: 'limit', type: 'number', name: 'Folders shown', def: 7, min: 3, max: 20 },
      { key: 'depth', type: 'number', name: 'Group at depth', desc: '1 groups by top-level folder.', def: 0, min: 0, max: 4 },
    ],
  },
  tags: {
    name: 'Tag cloud', desc: 'Most used tags.',
    size: { w: 4, h: 4 },
    options: [{ key: 'limit', type: 'number', name: 'Tags shown', def: 24, min: 5, max: 80 }],
  },
  hubs: {
    name: 'Hub notes', desc: 'Notes with the most inbound links.',
    size: { w: 4, h: 5 },
    options: [{ key: 'limit', type: 'number', name: 'Rows', def: 8, min: 3, max: 30 }],
  },
  review: {
    name: 'Needs review', desc: 'Notes without inbound links.',
    size: { w: 4, h: 5 },
    options: [
      { key: 'limit', type: 'number', name: 'Rows', def: 8, min: 3, max: 30 },
      { key: 'strict', type: 'toggle', name: 'Only fully orphaned', desc: 'No inbound and no outbound links.', def: false },
    ],
  },
  calendar: {
    name: 'Calendar', desc: 'Month grid shaded by activity.',
    size: { w: 4, h: 6 },
    options: [
      { key: 'source', type: 'dropdown', name: 'Shade by', def: 'mtime',
        choices: { mtime: 'Files modified', ctime: 'Files created' } },
      { key: 'folder', type: 'folder', name: 'Daily notes folder', desc: 'Used when clicking a day.', def: 'Daily' },
      { key: 'format', type: 'text', name: 'Filename format', def: 'YYYY-MM-DD' },
    ],
  },
  heatmap: {
    name: 'Contribution map', desc: 'Weeks of activity as a heatmap.',
    size: { w: 12, h: 4 },
    options: [
      { key: 'weeks', type: 'number', name: 'Weeks', def: 26, min: 8, max: 53 },
      { key: 'source', type: 'dropdown', name: 'Count', def: 'mtime',
        choices: { mtime: 'Files modified', ctime: 'Files created' } },
    ],
  },
  shortcuts: {
    name: 'Shortcuts', desc: 'Buttons that open or create notes.',
    size: { w: 4, h: 3 },
    options: [{ key: 'items', type: 'shortcuts', name: 'Shortcuts', def: [] }],
  },
};

const ORDER = Object.keys(WIDGETS);

function widgetDefaults(id) {
  const out = { enabled: true, scopeMode: 'inherit', include: '', exclude: '' };
  for (const o of WIDGETS[id].options) out[o.key] = Array.isArray(o.def) ? o.def.slice() : o.def;
  return out;
}

function defaultSettings() {
  const widgets = {};
  for (const id of ORDER) widgets[id] = widgetDefaults(id);
  return {
    title: 'ZCore',
    dateFormat: 'dddd, D MMMM YYYY',
    scope: { mode: 'all', include: '', exclude: '' },
    ambient: true,
    rowHeight: 44,
    gap: 14,
    locked: false,
    layout: {},
    widgets,
  };
}

/* ------------------------------------------------------------------ scope */

function splitPaths(value) {
  return String(value || '')
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
}

function inFolder(path, folder) {
  return folder === '' ? true : path === folder || path.startsWith(folder + '/');
}

function scopeFilter(scope) {
  const include = splitPaths(scope.include);
  const exclude = splitPaths(scope.exclude);
  if (scope.mode === 'include' && include.length) {
    return (f) => include.some((p) => inFolder(f.path, p)) && !exclude.some((p) => inFolder(f.path, p));
  }
  if (scope.mode === 'exclude' && exclude.length) {
    return (f) => !exclude.some((p) => inFolder(f.path, p));
  }
  return () => true;
}

/* ------------------------------------------------------------------ grid engine */

function normalise(item) {
  return {
    x: Math.max(0, Math.min(COLS - 1, Math.round(item.x))),
    y: Math.max(0, Math.round(item.y)),
    w: Math.max(2, Math.min(COLS, Math.round(item.w))),
    h: Math.max(2, Math.round(item.h)),
  };
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Push colliding items downward until nothing overlaps `movedId`. */
function resolve(layout, movedId) {
  const ids = Object.keys(layout);
  let guard = 0;
  let dirty = true;
  while (dirty && guard++ < 200) {
    dirty = false;
    const sorted = ids.slice().sort((a, b) => layout[a].y - layout[b].y);
    for (const id of sorted) {
      if (id === movedId) continue;
      for (const other of sorted) {
        if (other === id) continue;
        const a = layout[id];
        const b = layout[other];
        if (!overlaps(a, b)) continue;
        // the item that started lower (or the non-moved one) gives way
        const yields = other === movedId ? id : a.y >= b.y ? id : other;
        const against = yields === id ? b : a;
        layout[yields].y = against.y + against.h;
        dirty = true;
      }
    }
  }
}

/** Pull every item as far up as it fits, preserving reading order. */
function compact(layout) {
  const ids = Object.keys(layout).sort((a, b) => layout[a].y - layout[b].y || layout[a].x - layout[b].x);
  const placed = [];
  for (const id of ids) {
    const item = layout[id];
    let y = item.y;
    while (y > 0) {
      const probe = { x: item.x, y: y - 1, w: item.w, h: item.h };
      if (placed.some((p) => overlaps(probe, p))) break;
      y--;
    }
    item.y = y;
    placed.push({ x: item.x, y: item.y, w: item.w, h: item.h });
  }
}

function moveItem(layout, id, target) {
  const item = layout[id];
  item.x = Math.max(0, Math.min(COLS - item.w, target.x));
  item.y = Math.max(0, target.y);
  if (target.w) item.w = Math.max(2, Math.min(COLS - item.x, target.w));
  if (target.h) item.h = Math.max(2, target.h);
  resolve(layout, id);
  compact(layout);
  return layout;
}

function packDefault(ids) {
  const layout = {};
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const id of ids) {
    const size = WIDGETS[id].size;
    if (x + size.w > COLS) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    layout[id] = { x, y, w: size.w, h: size.h };
    x += size.w;
    rowH = Math.max(rowH, size.h);
  }
  compact(layout);
  return layout;
}

function rowsUsed(layout) {
  return Object.values(layout).reduce((m, i) => Math.max(m, i.y + i.h), 0);
}

/* ------------------------------------------------------------------ dataset */

const TASK_RE = /^[\t ]*[-*+] \[( |x|X)\]\s?(.*)$/;

class Dataset {
  constructor(app) {
    this.app = app;
    this.cache = new Map();
  }

  async build() {
    const app = this.app;
    this.all = app.vault.getMarkdownFiles();
    const mc = app.metadataCache;
    const resolved = mc.resolvedLinks || {};
    const unresolved = mc.unresolvedLinks || {};

    this.inlinks = new Map();
    this.outCount = new Map();
    for (const [src, targets] of Object.entries(resolved)) {
      let out = 0;
      for (const [dest, n] of Object.entries(targets)) {
        out += n;
        this.inlinks.set(dest, (this.inlinks.get(dest) || 0) + n);
      }
      this.outCount.set(src, out);
    }
    this.unresolved = new Map(
      Object.entries(unresolved).map(([src, o]) => [src, Object.keys(o).length])
    );

    this.info = new Map();
    await Promise.all(
      this.all.map(async (file) => {
        const hit = this.cache.get(file.path);
        if (hit && hit.mtime === file.stat.mtime) {
          this.info.set(file.path, hit);
          return;
        }
        const text = await app.vault.cachedRead(file);
        const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
        const words = (body.replace(/[`*_>#[\]()~]/g, ' ').match(/\S+/g) || []).length;
        const tasks = [];
        body.split('\n').forEach((line, i) => {
          const m = line.match(TASK_RE);
          if (m && m[2].trim()) tasks.push({ done: m[1] !== ' ', text: m[2].trim(), line: i });
        });
        const offset = text.length - body.length ? text.slice(0, text.length - body.length).split('\n').length - 1 : 0;
        const info = { mtime: file.stat.mtime, words, tasks, offset };
        this.cache.set(file.path, info);
        this.info.set(file.path, info);
      })
    );
    return this;
  }

  subset(scope) {
    const keep = scopeFilter(scope);
    const files = this.all.filter(keep);
    const mc = this.app.metadataCache;

    let words = 0;
    let links = 0;
    let unresolvedCount = 0;
    let openTasks = 0;
    let doneTasks = 0;
    const pending = [];
    const tagCounts = new Map();

    for (const file of files) {
      const info = this.info.get(file.path);
      links += this.outCount.get(file.path) || 0;
      unresolvedCount += this.unresolved.get(file.path) || 0;
      if (info) {
        words += info.words;
        for (const t of info.tasks) {
          if (t.done) doneTasks++;
          else {
            openTasks++;
            if (pending.length < 500) pending.push({ file, text: t.text, line: t.line + (info.offset || 0) });
          }
        }
      }
      const cache = mc.getFileCache(file);
      const tags = cache ? getAllTags(cache) || [] : [];
      for (const tag of new Set(tags)) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    const inbound = (f) => this.inlinks.get(f.path) || 0;
    return {
      files, words, links, unresolvedCount, openTasks, doneTasks, pending, tagCounts, inbound,
      unlinked: files.filter((f) => !inbound(f)),
      orphans: files.filter((f) => !inbound(f) && !(this.outCount.get(f.path) || 0)),
    };
  }
}

/* ------------------------------------------------------------------ widget settings modal */

class WidgetModal extends Modal {
  constructor(app, plugin, id, onDone) {
    super(app);
    this.plugin = plugin;
    this.id = id;
    this.onDone = onDone;
  }

  onOpen() {
    const def = WIDGETS[this.id];
    const cfg = this.plugin.settings.widgets[this.id];
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('zc-modal');
    contentEl.createEl('h3', { text: def.name });
    contentEl.createEl('p', { cls: 'zc-modal-desc', text: def.desc });

    new Setting(contentEl)
      .setName('Enabled')
      .addToggle((t) => t.setValue(cfg.enabled !== false).onChange((v) => this.set('enabled', v)));

    new Setting(contentEl).setName('Scope').setHeading();

    new Setting(contentEl)
      .setName('Folders counted')
      .setDesc('Inherit uses the global scope from the plugin settings.')
      .addDropdown((d) =>
        d
          .addOptions({ inherit: 'Inherit global', all: 'Whole vault', include: 'Only these folders', exclude: 'Everything except' })
          .setValue(cfg.scopeMode || 'inherit')
          .onChange((v) => {
            this.set('scopeMode', v);
            this.onOpen();
          })
      );

    if (cfg.scopeMode === 'include') {
      new Setting(contentEl)
        .setName('Include folders')
        .setDesc('One per line.')
        .addTextArea((t) => {
          t.inputEl.rows = 3;
          t.setValue(cfg.include || '').onChange((v) => this.set('include', v));
        });
    }
    if (cfg.scopeMode === 'include' || cfg.scopeMode === 'exclude') {
      new Setting(contentEl)
        .setName('Exclude folders')
        .setDesc('One per line.')
        .addTextArea((t) => {
          t.inputEl.rows = 3;
          t.setValue(cfg.exclude || '').onChange((v) => this.set('exclude', v));
        });
    }

    if (def.options.length) new Setting(contentEl).setName('Options').setHeading();
    for (const opt of def.options) this.renderOption(contentEl, opt, cfg);

    new Setting(contentEl).addButton((b) =>
      b.setButtonText('Done').setCta().onClick(() => this.close())
    );
  }

  renderOption(parent, opt, cfg) {
    if (opt.type === 'shortcuts') return this.renderShortcuts(parent, cfg);
    if (opt.type === 'tiles') return this.renderTiles(parent, cfg, opt);
    const s = new Setting(parent).setName(opt.name);
    if (opt.desc) s.setDesc(opt.desc);
    const value = cfg[opt.key];
    if (opt.type === 'toggle') {
      s.addToggle((t) => t.setValue(value !== false).onChange((v) => this.set(opt.key, v)));
    } else if (opt.type === 'number') {
      s.addSlider((sl) =>
        sl
          .setLimits(opt.min, opt.max, 1)
          .setValue(Number(value) || opt.def)
          .setDynamicTooltip()
          .onChange((v) => this.set(opt.key, v))
      );
    } else if (opt.type === 'dropdown') {
      s.addDropdown((d) => d.addOptions(opt.choices).setValue(value || opt.def).onChange((v) => this.set(opt.key, v)));
    } else {
      s.addText((t) =>
        t
          .setPlaceholder(opt.def || '')
          .setValue(value == null ? '' : String(value))
          .onChange((v) => this.set(opt.key, v))
      );
      if (opt.type === 'folder') s.setDesc((opt.desc ? opt.desc + ' ' : '') + 'Leave empty for the vault root.');
    }
  }

  renderTiles(parent, cfg, opt) {
    const tiles = Array.isArray(cfg.tiles) && cfg.tiles.length ? cfg.tiles : opt.def.slice();
    cfg.tiles = tiles;
    parent.createEl('p', {
      cls: 'zc-modal-desc',
      text: 'Each tile can inherit the widget scope or count a different set of folders.',
    });
    tiles.forEach((tile, i) => {
      const box = parent.createDiv({ cls: 'zc-tile-cfg' });
      const head = new Setting(box).setName(tile.label);
      head.addToggle((t) =>
        t.setValue(tile.enabled !== false).onChange((v) => {
          tiles[i].enabled = v;
          this.set('tiles', tiles);
        })
      );
      head.addDropdown((d) =>
        d
          .addOptions({ inherit: 'Inherit widget', all: 'Whole vault', include: 'Only these', exclude: 'Except these' })
          .setValue(tile.scopeMode || 'inherit')
          .onChange((v) => {
            tiles[i].scopeMode = v;
            this.set('tiles', tiles);
            this.onOpen();
          })
      );
      if (tile.scopeMode === 'include') {
        new Setting(box).setName('Include folders').setDesc('One per line.').addTextArea((t) => {
          t.inputEl.rows = 2;
          t.setValue(tile.include || '').onChange((v) => {
            tiles[i].include = v;
            this.set('tiles', tiles);
          });
        });
      }
      if (tile.scopeMode === 'include' || tile.scopeMode === 'exclude') {
        new Setting(box).setName('Exclude folders').setDesc('One per line.').addTextArea((t) => {
          t.inputEl.rows = 2;
          t.setValue(tile.exclude || '').onChange((v) => {
            tiles[i].exclude = v;
            this.set('tiles', tiles);
          });
        });
      }
    });
  }

  renderShortcuts(parent, cfg) {
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    const wrap = parent.createDiv();
    items.forEach((item, i) => {
      const row = new Setting(wrap).setName(`Shortcut ${i + 1}`);
      row.addText((t) =>
        t.setPlaceholder('Label').setValue(item.label || '').onChange((v) => {
          items[i].label = v;
          this.set('items', items);
        })
      );
      row.addText((t) =>
        t.setPlaceholder('Path, e.g. Home.md').setValue(item.path || '').onChange((v) => {
          items[i].path = v;
          this.set('items', items);
        })
      );
      row.addDropdown((d) =>
        d
          .addOptions({ open: 'Open only', create: 'Open or create' })
          .setValue(item.mode || 'open')
          .onChange((v) => {
            items[i].mode = v;
            this.set('items', items);
          })
      );
      row.addExtraButton((b) =>
        b.setIcon('trash').setTooltip('Remove').onClick(() => {
          items.splice(i, 1);
          this.set('items', items);
          this.onOpen();
        })
      );
    });
    new Setting(wrap).addButton((b) =>
      b.setButtonText('Add shortcut').onClick(() => {
        items.push({ label: '', path: '', mode: 'open' });
        this.set('items', items);
        this.onOpen();
      })
    );
  }

  set(key, value) {
    const cfg = this.plugin.settings.widgets[this.id];
    cfg[key] = value;
    this.plugin.save();
  }

  onClose() {
    this.contentEl.empty();
    if (this.onDone) this.onDone();
  }
}

/* ------------------------------------------------------------------ view */

class DashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.data = new Dataset(this.app);
    this.month = moment().startOf('month');
    this.cards = new Map();
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'ZCore'; }
  getIcon() { return 'radar'; }

  async onOpen() {
    this.containerEl.addClass('zcore-view');
    ['modify', 'create', 'delete', 'rename'].forEach((evt) =>
      this.registerEvent(this.app.vault.on(evt, () => this.queueRefresh()))
    );
    this.ro = new ResizeObserver(() => this.applyPositions());
    await this.rebuild();
  }

  onClose() {
    window.clearTimeout(this._t);
    if (this.ro) this.ro.disconnect();
    return Promise.resolve();
  }

  queueRefresh() {
    window.clearTimeout(this._t);
    this._t = window.setTimeout(() => this.refreshData(), 1200);
  }

  settings() { return this.plugin.settings; }

  activeIds() {
    const w = this.settings().widgets;
    return ORDER.filter((id) => w[id] && w[id].enabled !== false);
  }

  layout() {
    const s = this.settings();
    const ids = this.activeIds();
    const saved = s.layout || {};
    const missing = ids.filter((id) => !saved[id]);
    if (missing.length) {
      const packed = packDefault(ids);
      for (const id of ids) if (!saved[id]) saved[id] = packed[id];
      s.layout = saved;
      this.plugin.save();
    }
    const live = {};
    for (const id of ids) live[id] = normalise(saved[id]);
    return live;
  }

  /* ---------- shell ---------- */

  async rebuild() {
    const root = this.contentEl;
    root.empty();
    root.addClass('zc-root');
    root.toggleClass('zc-ambient', this.settings().ambient !== false);

    const head = root.createDiv({ cls: 'zc-head' });
    const left = head.createDiv();
    const s = this.settings();
    const title = left.createEl('button', {
      cls: 'zc-title',
      text: s.title || 'ZCore',
    });
    title.onclick = () => this.plugin.openSettings();
    if (s.dateFormat) {
      left.createDiv({ cls: 'zc-sub', text: moment().format(s.dateFormat).toUpperCase() });
    }
    const gear = head.createEl('button', { cls: 'zc-icon-btn', attr: { 'aria-label': 'Plugin settings' } });
    gear.setText('⚙');
    gear.onclick = () => this.plugin.openSettings();

    this.canvas = root.createDiv({ cls: 'zc-canvas' });
    this.ghost = this.canvas.createDiv({ cls: 'zc-ghost' });
    this.ghost.hide();

    this.cards.clear();
    this.work = this.layout();
    for (const id of this.activeIds()) this.buildCard(id);
    this.applyPositions();
    this.ro.observe(this.canvas);
    await this.refreshData();
  }

  buildCard(id) {
    const def = WIDGETS[id];
    const card = this.canvas.createDiv({ cls: 'zc-card' });
    card.dataset.id = id;
    const head = card.createDiv({ cls: 'zc-card-head' });
    head.createDiv({ cls: 'zc-card-title', text: def.name });
    const tools = head.createDiv({ cls: 'zc-card-tools' });
    const extra = tools.createDiv({ cls: 'zc-card-extra' });
    const cog = tools.createEl('button', { cls: 'zc-icon-btn zc-sm', attr: { 'aria-label': 'Widget settings' } });
    cog.setText('⚙');
    cog.onclick = (e) => {
      e.stopPropagation();
      new WidgetModal(this.app, this.plugin, id, () => this.rebuild()).open();
    };
    const body = card.createDiv({ cls: 'zc-card-body' });
    const handle = card.createDiv({ cls: 'zc-resize', attr: { 'aria-label': 'Resize' } });

    this.cards.set(id, { card, body, extra });
    head.addEventListener('pointerdown', (e) => this.startDrag(e, id, card, 'move'));
    handle.addEventListener('pointerdown', (e) => this.startDrag(e, id, card, 'resize'));
    return card;
  }

  metrics() {
    const s = this.settings();
    const gap = s.gap || 14;
    const width = this.canvas.clientWidth || 1;
    const colW = (width - gap * (COLS - 1)) / COLS;
    return { gap, colW, rowH: s.rowHeight || 44 };
  }

  applyPositions(preview) {
    if (!this.canvas) return;
    const layout = preview || this.work;
    const { gap, colW, rowH } = this.metrics();
    for (const [id, { card }] of this.cards) {
      const item = layout[id];
      if (!item) continue;
      card.style.left = item.x * (colW + gap) + 'px';
      card.style.top = item.y * (rowH + gap) + 'px';
      card.style.width = item.w * colW + (item.w - 1) * gap + 'px';
      card.style.height = item.h * rowH + (item.h - 1) * gap + 'px';
    }
    this.canvas.style.height = rowsUsed(layout) * (rowH + gap) + 120 + 'px';
  }

  startDrag(e, id, card, mode) {
    if (this.settings().locked) return;
    if (e.button !== 0 || e.target.closest('.zc-icon-btn')) return;
    e.preventDefault();
    const { gap, colW, rowH } = this.metrics();
    const item = this.work[id];
    const px = { x: e.clientX, y: e.clientY };
    const origin = { x: item.x, y: item.y, w: item.w, h: item.h };
    card.addClass('is-dragging');
    this.canvas.addClass('is-grid');
    this.ghost.show();
    const drawGhost = (it) => {
      this.ghost.style.left = it.x * (colW + gap) + 'px';
      this.ghost.style.top = it.y * (rowH + gap) + 'px';
      this.ghost.style.width = it.w * colW + (it.w - 1) * gap + 'px';
      this.ghost.style.height = it.h * rowH + (it.h - 1) * gap + 'px';
    };
    drawGhost(item);

    const move = (ev) => {
      const dx = Math.round((ev.clientX - px.x) / (colW + gap));
      const dy = Math.round((ev.clientY - px.y) / (rowH + gap));
      const target =
        mode === 'move'
          ? { x: origin.x + dx, y: origin.y + dy }
          : { x: origin.x, y: origin.y, w: origin.w + dx, h: origin.h + dy };
      const trial = {};
      for (const k of Object.keys(this.work)) trial[k] = { ...this.work[k] };
      moveItem(trial, id, target);
      this.pending = trial;
      drawGhost(trial[id]);
      for (const [other, { card: el }] of this.cards) {
        if (other === id) continue;
        const it = trial[other];
        if (!it) continue;
        el.style.left = it.x * (colW + gap) + 'px';
        el.style.top = it.y * (rowH + gap) + 'px';
      }
      if (mode === 'resize') {
        const it = trial[id];
        card.style.width = it.w * colW + (it.w - 1) * gap + 'px';
        card.style.height = it.h * rowH + (it.h - 1) * gap + 'px';
      } else {
        card.style.transform = `translate(${ev.clientX - px.x}px, ${ev.clientY - px.y}px)`;
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      card.removeClass('is-dragging');
      card.style.transform = '';
      this.canvas.removeClass('is-grid');
      this.ghost.hide();
      if (this.pending) {
        this.work = this.pending;
        this.pending = null;
        this.settings().layout = JSON.parse(JSON.stringify(this.work));
        this.plugin.save();
      }
      this.applyPositions();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /* ---------- data ---------- */

  scopeFor(id) {
    const cfg = this.settings().widgets[id];
    if (!cfg || cfg.scopeMode === 'inherit' || !cfg.scopeMode) return this.settings().scope;
    return { mode: cfg.scopeMode, include: cfg.include, exclude: cfg.exclude };
  }

  async refreshData() {
    if (!this.cards.size) return;
    for (const { body } of this.cards.values()) {
      if (!body.childElementCount) body.createDiv({ cls: 'zc-empty', text: 'READING VAULT…' });
    }
    await this.data.build();
    for (const id of this.activeIds()) {
      const entry = this.cards.get(id);
      if (!entry) continue;
      entry.body.empty();
      entry.extra.empty();
      const cfg = this.settings().widgets[id];
      const sub = this.data.subset(this.scopeFor(id));
      try {
        this['w_' + id](entry.body, sub, cfg);
      } catch (err) {
        entry.body.createDiv({ cls: 'zc-empty', text: 'WIDGET ERROR' });
        console.error('[ZCore]', id, err);
      }
    }
  }

  /* ---------- helpers ---------- */

  link(parent, file, cls) {
    const a = parent.createEl('a', { cls: cls || 'zc-link', text: file.basename, href: '#' });
    a.onclick = (e) => {
      e.preventDefault();
      this.app.workspace.getLeaf(e.metaKey || e.ctrlKey ? 'tab' : false).openFile(file);
    };
    return a;
  }

  none(parent, text) {
    parent.createDiv({ cls: 'zc-empty', text });
  }

  sub(parent, text) {
    parent.createDiv({ cls: 'zc-card-sub', text: String(text).toUpperCase() });
  }

  dayCounts(files, source) {
    const map = new Map();
    for (const f of files) {
      const ts = source === 'ctime' ? f.stat.ctime : f.stat.mtime;
      const k = moment(ts).format('YYYY-MM-DD');
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }

  /* ---------- widgets ---------- */

  w_uplink(body, d, cfg) {
    const tiles = Array.isArray(cfg.tiles) && cfg.tiles.length ? cfg.tiles : WIDGETS.uplink.options[0].def;
    const base = this.scopeFor('uplink');
    const cache = new Map();
    const setFor = (tile) => {
      const mode = tile.scopeMode || 'inherit';
      if (mode === 'inherit') return d;
      const key = mode + '|' + (tile.include || '') + '|' + (tile.exclude || '');
      if (!cache.has(key)) {
        cache.set(key, this.data.subset({ mode, include: tile.include, exclude: tile.exclude }));
      }
      return cache.get(key);
    };
    void base;

    const value = (id, s) => {
      switch (id) {
        case 'notes': return [s.files.length, ''];
        case 'words': return [s.words, ''];
        case 'links': return [s.links, ''];
        case 'tags': return [s.tagCounts.size, ''];
        case 'open': return [s.openTasks, s.openTasks ? 'is-warn' : 'is-good'];
        case 'done': return [s.doneTasks, 'is-good'];
        case 'orphans': return [s.orphans.length, ''];
        case 'unresolved': return [s.unresolvedCount, ''];
        default: return [0, ''];
      }
    };

    const wrap = body.createDiv({ cls: 'zc-stats' });
    let shown = 0;
    for (const tile of tiles) {
      if (tile.enabled === false) continue;
      shown++;
      const s = setFor(tile);
      const [n, mod] = value(tile.id, s);
      const el = wrap.createDiv({ cls: 'zc-stat' });
      const label = el.createDiv({ cls: 'zc-stat-label', text: tile.label.toUpperCase() });
      if ((tile.scopeMode || 'inherit') !== 'inherit') {
        label.createSpan({ cls: 'zc-stat-scope', text: '◆' });
        el.setAttr('aria-label', 'Custom scope');
      }
      el.createDiv({ cls: 'zc-stat-value' + (mod ? ' ' + mod : ''), text: Number(n).toLocaleString() });
    }
    if (!shown) this.none(body, 'ALL TILES HIDDEN');
  }

  w_pomodoro(body, d, cfg) {
    const p = this.plugin.pomo;
    const phaseName = { work: 'Focus', short: 'Short break', long: 'Long break' };

    const wrap = body.createDiv({ cls: 'zc-pomo' });
    const phase = wrap.createDiv({ cls: 'zc-pomo-phase', text: phaseName[p.phase].toUpperCase() });
    const clock = wrap.createDiv({ cls: 'zc-pomo-clock', text: '00:00' });
    const track = wrap.createDiv({ cls: 'zc-pomo-track' });
    const fill = track.createDiv({ cls: 'zc-pomo-fill' });
    const dots = wrap.createDiv({ cls: 'zc-pomo-dots' });

    const row = wrap.createDiv({ cls: 'zc-pomo-controls' });
    const toggle = row.createEl('button', { cls: 'zc-btn zc-btn-gold', text: 'Start' });
    const skip = row.createEl('button', { cls: 'zc-btn', text: 'Skip' });
    const reset = row.createEl('button', { cls: 'zc-btn', text: 'Reset' });

    toggle.onclick = () => this.plugin.pomoToggle();
    skip.onclick = () => this.plugin.pomoAdvance(true);
    reset.onclick = () => this.plugin.pomoReset();

    this.pomoEls = { phase, clock, fill, dots, toggle, wrap, phaseName };
    this.pomoTick();
  }

  pomoTick() {
    const els = this.pomoEls;
    if (!els || !els.clock.isConnected) return;
    const p = this.plugin.pomo;
    const cfg = this.settings().widgets.pomodoro;
    const totals = {
      work: (cfg.work || 25) * 60,
      short: (cfg.shortBreak || 5) * 60,
      long: (cfg.longBreak || 15) * 60,
    };
    const total = totals[p.phase] || 1;
    const left = Math.max(0, p.remaining);
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    els.clock.setText(mm + ':' + ss);
    els.phase.setText(els.phaseName[p.phase].toUpperCase());
    els.fill.style.width = Math.round(((total - left) / total) * 100) + '%';
    els.toggle.setText(p.running ? 'Pause' : left === total ? 'Start' : 'Resume');
    els.wrap.toggleClass('is-running', p.running);
    els.wrap.toggleClass('is-break', p.phase !== 'work');

    const cycles = cfg.cycles || 4;
    els.dots.empty();
    for (let i = 0; i < cycles; i++) {
      const dot = els.dots.createDiv({ cls: 'zc-pomo-dot' });
      if (i < p.done % cycles || (p.done % cycles === 0 && p.done > 0 && i === cycles - 1 && p.phase === 'long')) {
        dot.addClass('is-done');
      }
    }
    els.dots.createSpan({ cls: 'zc-pomo-count', text: p.done + ' completed' });
  }

  w_feed(body, d, cfg) {
    const list = [...d.files].sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, cfg.limit || 8);
    if (!list.length) return this.none(body, 'NO ACTIVITY');
    const feed = body.createDiv({ cls: 'zc-feed' });
    for (const f of list) {
      const row = feed.createDiv({ cls: 'zc-feed-row' });
      row.createDiv({ cls: 'zc-feed-time', text: moment(f.stat.mtime).format('HH:mm') });
      const mid = row.createDiv();
      if (cfg.showFolder !== false) {
        mid.createDiv({
          cls: 'zc-feed-tag',
          text: (f.parent && f.parent.path !== '/' ? f.parent.path : 'root').toUpperCase(),
        });
      }
      this.link(mid.createDiv({ cls: 'zc-feed-text' }), f);
      row.createDiv({ cls: 'zc-dot' });
    }
  }

  w_recent(body, d, cfg) {
    const days = cfg.days || 7;
    const key = cfg.sortBy === 'ctime' ? 'ctime' : 'mtime';
    const cut = moment().subtract(days, 'days').valueOf();
    const list = d.files
      .filter((f) => f.stat[key] >= cut)
      .sort((a, b) => b.stat[key] - a.stat[key])
      .slice(0, cfg.limit || 10);
    if (!list.length) return this.none(body, `NOTHING IN ${days} DAYS`);
    const wrap = body.createDiv({ cls: 'zc-list' });
    for (const f of list) {
      const row = wrap.createDiv({ cls: 'zc-list-row' });
      this.link(row, f);
      row.createSpan({ cls: 'zc-list-meta', text: moment(f.stat[key]).format('D MMM') });
    }
  }

  w_tasks(body, d, cfg) {
    if (!d.pending.length) return this.none(body, 'ALL CLEAR');
    this.sub(body, `${d.openTasks} open`);
    const wrap = body.createDiv({ cls: 'zc-tasks' });
    for (const t of d.pending.slice(0, cfg.limit || 12)) {
      const row = wrap.createDiv({ cls: 'zc-task' });
      const cb = row.createEl('input', { attr: { type: 'checkbox' } });
      cb.onchange = () => this.plugin.completeTask(t.file, t.line).then(() => this.refreshData());
      row.createDiv({ cls: 'zc-task-text', text: t.text });
      if (cfg.showSource !== false) this.link(row.createDiv({ cls: 'zc-task-src' }), t.file, 'zc-link zc-link-faint');
    }
  }

  w_agenda(body, d, cfg) {
    const folder = String(cfg.folder || '').replace(/^\/+|\/+$/g, '');
    const format = cfg.format || 'YYYY-MM-DD';
    const start = moment().startOf('isoWeek');
    const feed = body.createDiv({ cls: 'zc-feed' });
    for (let i = 0; i < 7; i++) {
      const day = start.clone().add(i, 'days');
      const name = day.format(format);
      const hit = d.files.find((f) => f.basename === name && inFolder(f.path, folder));
      const row = feed.createDiv({ cls: 'zc-feed-row' + (day.isSame(moment(), 'day') ? ' is-today' : '') });
      row.createDiv({ cls: 'zc-feed-time', text: day.format('ddd D').toUpperCase() });
      const mid = row.createDiv({ cls: 'zc-feed-text' });
      if (hit) this.link(mid, hit);
      else {
        const a = mid.createEl('a', { cls: 'zc-link zc-link-faint', text: '+ create', href: '#' });
        a.onclick = (e) => {
          e.preventDefault();
          this.plugin.openDated(day, cfg);
        };
      }
      const dot = row.createDiv({ cls: 'zc-dot' });
      if (!hit) dot.addClass('is-off');
    }
  }

  w_hourly(body, d, cfg) {
    const hours = cfg.hours || 12;
    const buckets = new Array(hours).fill(0);
    const now = moment();
    for (const f of d.files) {
      const diff = now.diff(moment(f.stat.mtime), 'hours');
      if (diff >= 0 && diff < hours) buckets[hours - 1 - diff]++;
    }
    const peak = Math.max(1, ...buckets);
    const spark = body.createDiv({ cls: 'zc-spark' });
    buckets.forEach((v, i) => {
      const col = spark.createDiv({ cls: 'zc-spark-col' });
      const bar = col.createDiv({ cls: 'zc-spark-bar' + (v === peak && v > 0 ? ' is-peak' : '') });
      bar.style.height = Math.max(3, Math.round((v / peak) * 100)) + '%';
      bar.setAttr('aria-label', `${v} file(s)`);
      col.createDiv({ cls: 'zc-spark-label', text: now.clone().subtract(hours - 1 - i, 'hours').format('HH') });
    });
    this.sub(body, `peak ${peak} file(s)`);
  }

  w_folders(body, d, cfg) {
    const depth = Number(cfg.depth) || 0;
    const counts = new Map();
    for (const f of d.files) {
      let k = f.parent && f.parent.path !== '/' ? f.parent.path : 'root';
      if (depth > 0 && k !== 'root') k = k.split('/').slice(0, depth).join('/');
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, cfg.limit || 7);
    if (!top.length) return this.none(body, 'NO NOTES IN SCOPE');
    const max = Math.max(1, ...top.map((t) => t[1]));
    const bars = body.createDiv({ cls: 'zc-bars' });
    top.forEach(([name, n], i) => {
      const g = bars.createDiv();
      const row = g.createDiv({ cls: 'zc-bar-row' });
      row.createSpan({ text: name });
      row.createSpan({ text: String(n) });
      const fill = g.createDiv({ cls: 'zc-bar-track' }).createDiv({ cls: 'zc-bar-fill' + (i === 0 ? ' is-gold' : '') });
      fill.style.width = Math.round((n / max) * 100) + '%';
    });
  }

  w_tags(body, d, cfg) {
    const top = [...d.tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, cfg.limit || 24);
    if (!top.length) return this.none(body, 'NO TAGS IN SCOPE');
    const max = top[0][1];
    const cloud = body.createDiv({ cls: 'zc-cloud' });
    for (const [tag, n] of top) {
      const chip = cloud.createEl('a', { cls: 'zc-chip', text: tag, href: '#' });
      chip.style.fontSize = 10 + Math.round((n / max) * 6) + 'px';
      chip.setAttr('aria-label', `${n} note(s)`);
      chip.onclick = (e) => {
        e.preventDefault();
        this.plugin.searchTag(tag);
      };
    }
  }

  w_hubs(body, d, cfg) {
    const ranked = d.files
      .map((f) => ({ f, n: d.inbound(f) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, cfg.limit || 8);
    if (!ranked.length) return this.none(body, 'NO INBOUND LINKS');
    const max = ranked[0].n;
    const bars = body.createDiv({ cls: 'zc-bars' });
    for (const { f, n } of ranked) {
      const g = bars.createDiv();
      const row = g.createDiv({ cls: 'zc-bar-row' });
      this.link(row, f, 'zc-link zc-link-faint');
      row.createSpan({ text: String(n) });
      const fill = g.createDiv({ cls: 'zc-bar-track' }).createDiv({ cls: 'zc-bar-fill' });
      fill.style.width = Math.round((n / max) * 100) + '%';
    }
  }

  w_review(body, d, cfg) {
    const pool = cfg.strict ? d.orphans : d.unlinked;
    const list = [...pool].sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, cfg.limit || 8);
    if (!list.length) return this.none(body, 'FULLY LINKED');
    const wrap = body.createDiv({ cls: 'zc-list' });
    for (const f of list) {
      const row = wrap.createDiv({ cls: 'zc-list-row' });
      this.link(row, f);
      row.createSpan({ cls: 'zc-list-meta', text: moment(f.stat.mtime).format('D MMM') });
    }
  }

  w_calendar(body, d, cfg) {
    const nav = body.createDiv({ cls: 'zc-cal-nav' });
    const prev = nav.createEl('button', { cls: 'zc-icon-btn zc-sm', text: '‹' });
    nav.createSpan({ cls: 'zc-cal-month', text: this.month.format('MMMM YYYY').toUpperCase() });
    const next = nav.createEl('button', { cls: 'zc-icon-btn zc-sm', text: '›' });
    prev.onclick = () => { this.month = this.month.clone().subtract(1, 'month'); this.refreshData(); };
    next.onclick = () => { this.month = this.month.clone().add(1, 'month'); this.refreshData(); };

    const counts = this.dayCounts(d.files, cfg.source);
    const cal = body.createDiv({ cls: 'zc-cal' });
    for (const w of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) cal.createDiv({ cls: 'zc-cal-dow', text: w });
    const first = this.month.clone().startOf('month');
    const lead = (first.isoWeekday() + 6) % 7;
    for (let i = 0; i < lead; i++) cal.createDiv({ cls: 'zc-cal-day is-blank' });
    for (let day = 1; day <= this.month.daysInMonth(); day++) {
      const date = first.clone().date(day);
      const n = counts.get(date.format('YYYY-MM-DD')) || 0;
      const cell = cal.createDiv({ cls: 'zc-cal-day', text: String(day) });
      if (date.isSame(moment(), 'day')) cell.addClass('is-today');
      if (n) {
        cell.addClass('is-hit');
        cell.style.setProperty('--zc-lvl', String(Math.min(1, 0.3 + n / 8)));
        cell.setAttr('aria-label', `${n} file(s)`);
      }
      cell.onclick = () => this.plugin.openDated(date, cfg);
    }
  }

  w_heatmap(body, d, cfg) {
    const entry = this.cards.get('heatmap');
    if (entry) {
      const seg = entry.extra.createDiv({ cls: 'zc-seg' });
      const mk = (key, label) => {
        const b = seg.createEl('button', {
          cls: 'zc-seg-btn' + ((cfg.source || 'mtime') === key ? ' is-on' : ''),
          text: label,
        });
        b.onclick = (e) => {
          e.stopPropagation();
          cfg.source = key;
          this.plugin.saveQuiet();
          this.refreshData();
        };
      };
      mk('mtime', 'Modified');
      mk('ctime', 'Created');
    }
    const weeks = cfg.weeks || 26;
    const counts = this.dayCounts(d.files, cfg.source);
    const end = moment().endOf('isoWeek');
    const start = end.clone().subtract(weeks * 7 - 1, 'days');

    const values = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = start.clone().add(i, 'days');
      values.push(counts.get(date.format('YYYY-MM-DD')) || 0);
    }
    const busiest = Math.max(1, ...values);
    const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / busiest) * 4)));
    const total = values.reduce((s, n) => s + n, 0);

    const wrap = body.createDiv({ cls: 'zc-gh' });

    const months = wrap.createDiv({ cls: 'zc-gh-months' });
    months.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const first = start.clone().add(w * 7, 'days');
      const cell = months.createDiv({ cls: 'zc-gh-month' });
      if (first.month() !== lastMonth && first.date() <= 7) {
        cell.setText(first.format('MMM'));
        lastMonth = first.month();
      }
    }

    const dows = wrap.createDiv({ cls: 'zc-gh-dows' });
    ['Mon', '', 'Wed', '', 'Fri', '', ''].forEach((label) =>
      dows.createDiv({ cls: 'zc-gh-dow', text: label })
    );

    const grid = wrap.createDiv({ cls: 'zc-gh-grid' });
    grid.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
    for (let w = 0; w < weeks; w++) {
      const col = grid.createDiv({ cls: 'zc-gh-col' });
      for (let i = 0; i < 7; i++) {
        const idx = w * 7 + i;
        const date = start.clone().add(idx, 'days');
        const n = values[idx];
        const cell = col.createDiv({ cls: 'zc-gh-cell' });
        if (date.isAfter(moment(), 'day')) {
          cell.addClass('is-future');
          continue;
        }
        cell.dataset.level = String(level(n));
        cell.setAttr('aria-label', `${n} file(s) on ${date.format('D MMM YYYY')}`);
      }
    }

    const foot = wrap.createDiv({ cls: 'zc-gh-foot' });
    foot.createSpan({ cls: 'zc-gh-total', text: `${total} changes in the last ${weeks} weeks` });
    const legend = foot.createDiv({ cls: 'zc-gh-legend' });
    legend.createSpan({ text: 'Less' });
    for (let l = 0; l <= 4; l++) {
      legend.createDiv({ cls: 'zc-gh-cell' }).dataset.level = String(l);
    }
    legend.createSpan({ text: 'More' });
  }

  w_shortcuts(body, d, cfg) {
    const items = (Array.isArray(cfg.items) ? cfg.items : []).filter((i) => i && i.path);
    if (!items.length) return this.none(body, 'ADD SHORTCUTS IN WIDGET SETTINGS');
    const wrap = body.createDiv({ cls: 'zc-shortcuts' });
    for (const item of items) {
      const path = item.path.endsWith('.md') ? item.path : item.path + '.md';
      const file = this.app.vault.getAbstractFileByPath(path);
      const exists = file instanceof TFile;
      const canCreate = item.mode === 'create';
      const btn = wrap.createEl('a', {
        cls: 'zc-shortcut' + (exists ? '' : canCreate ? ' is-new' : ' is-missing'),
        text: item.label || path.split('/').pop().replace(/\.md$/, ''),
        href: '#',
      });
      btn.setAttr('aria-label', exists ? path : canCreate ? 'Create ' + path : 'Missing: ' + path);
      if (!exists && canCreate) btn.createSpan({ cls: 'zc-shortcut-flag', text: '+' });
      btn.onclick = async (e) => {
        e.preventDefault();
        if (exists) return this.app.workspace.getLeaf(false).openFile(file);
        if (!canCreate) return new Notice('Not found: ' + path);
        const created = await this.plugin.ensureFile(path);
        await this.app.workspace.getLeaf(false).openFile(created);
        this.queueRefresh();
      };
    }
  }
}

/* ------------------------------------------------------------------ settings tab */

class SettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const c = this.containerEl;
    c.empty();
    const s = this.plugin.settings;

    new Setting(c).setName('Dashboard').setHeading();
    new Setting(c)
      .setName('Title')
      .setDesc('Shown at the top of the view.')
      .addText((t) =>
        t.setPlaceholder('ZCore Mission Control').setValue(s.title || '').onChange((v) => {
          s.title = v;
          this.plugin.save();
        })
      );

    const PRESETS = {
      'dddd, D MMMM YYYY': 'Long — Friday, 11 September 2026',
      'ddd D MMM YYYY': 'Medium — Fri 11 Sep 2026',
      'YYYY-MM-DD': 'ISO — 2026-09-11',
      'DD/MM/YYYY': 'Numeric — 11/09/2026',
      'D MMMM': 'Day and month — 11 September',
      '': 'Hidden',
    };
    const known = Object.prototype.hasOwnProperty.call(PRESETS, s.dateFormat);
    new Setting(c)
      .setName('Date format')
      .setDesc('Moment.js tokens.')
      .addDropdown((d) =>
        d
          .addOptions(Object.assign({}, PRESETS, { custom: 'Custom…' }))
          .setValue(known ? s.dateFormat : 'custom')
          .onChange((v) => {
            if (v === 'custom') s.dateFormat = s.dateFormat || 'YYYY-MM-DD';
            else s.dateFormat = v;
            this.plugin.save();
            this.display();
          })
      );
    if (!known) {
      new Setting(c)
        .setName('Custom date format')
        .setDesc('Preview: ' + moment().format(s.dateFormat || 'YYYY-MM-DD'))
        .addText((t) =>
          t.setValue(s.dateFormat || '').onChange((v) => {
            s.dateFormat = v;
            this.plugin.save();
          })
        );
    }

    new Setting(c).setName('Global scope').setHeading();
    new Setting(c)
      .setName('Folders counted')
      .setDesc('Widgets set to “Inherit global” use this.')
      .addDropdown((d) =>
        d
          .addOptions({ all: 'Whole vault', include: 'Only these folders', exclude: 'Everything except' })
          .setValue(s.scope.mode)
          .onChange((v) => {
            s.scope.mode = v;
            this.plugin.save();
            this.display();
          })
      );
    if (s.scope.mode === 'include') {
      new Setting(c).setName('Include folders').setDesc('One per line.').addTextArea((t) => {
        t.inputEl.rows = 3;
        t.setValue(s.scope.include).onChange((v) => {
          s.scope.include = v;
          this.plugin.save();
        });
      });
    }
    if (s.scope.mode !== 'all') {
      new Setting(c).setName('Exclude folders').setDesc('One per line.').addTextArea((t) => {
        t.inputEl.rows = 3;
        t.setValue(s.scope.exclude).onChange((v) => {
          s.scope.exclude = v;
          this.plugin.save();
        });
      });
    }

    new Setting(c).setName('Grid').setHeading();
    new Setting(c)
      .setName('Row height')
      .setDesc('Height of one grid row in pixels.')
      .addSlider((sl) =>
        sl.setLimits(28, 80, 2).setValue(s.rowHeight).setDynamicTooltip().onChange((v) => {
          s.rowHeight = v;
          this.plugin.save();
        })
      );
    new Setting(c)
      .setName('Gap')
      .addSlider((sl) =>
        sl.setLimits(6, 28, 2).setValue(s.gap).setDynamicTooltip().onChange((v) => {
          s.gap = v;
          this.plugin.save();
        })
      );
    new Setting(c)
      .setName('Lock layout')
      .setDesc('Disable dragging and resizing.')
      .addToggle((t) => t.setValue(s.locked === true).onChange((v) => {
        s.locked = v;
        this.plugin.save();
      }));
    new Setting(c)
      .setName('Ambient background')
      .addToggle((t) => t.setValue(s.ambient !== false).onChange((v) => {
        s.ambient = v;
        this.plugin.save();
      }));
    new Setting(c)
      .setName('Reset layout')
      .setDesc('Repack every widget into the default arrangement.')
      .addButton((b) =>
        b.setButtonText('Reset').setWarning().onClick(() => {
          s.layout = {};
          this.plugin.save();
          new Notice('Layout reset');
        })
      );

    new Setting(c).setName('Widgets').setHeading();
    for (const id of ORDER) {
      const def = WIDGETS[id];
      const cfg = s.widgets[id];
      new Setting(c)
        .setName(def.name)
        .setDesc(def.desc)
        .addToggle((t) =>
          t.setValue(cfg.enabled !== false).onChange((v) => {
            cfg.enabled = v;
            this.plugin.save();
          })
        )
        .addButton((b) =>
          b.setButtonText('Configure').onClick(() => new WidgetModal(this.app, this.plugin, id).open())
        );
    }
  }
}

/* ------------------------------------------------------------------ plugin */

module.exports = class ZCorePlugin extends Plugin {
  async onload() {
    try {
      await this.loadSettings();
    } catch (err) {
      console.error('[ZCore] settings failed to load, using defaults', err);
      this.settings = defaultSettings();
    }

    this.pomo = { phase: 'work', remaining: (this.settings.widgets.pomodoro.work || 25) * 60, running: false, done: 0 };
    this.registerInterval(window.setInterval(() => this.pomoStep(), 1000));

    this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.addRibbonIcon('radar', 'ZCore', () => this.activate());
    this.addSettingTab(new SettingsTab(this.app, this));

    this.addCommand({ id: 'open', name: 'Open dashboard', callback: () => this.activate() });
    this.addCommand({
      id: 'settings',
      name: 'Open dashboard settings',
      callback: () => this.openSettings(),
    });
    this.addCommand({
      id: 'toggle-lock',
      name: 'Toggle layout lock',
      callback: () => {
        this.settings.locked = !this.settings.locked;
        this.save();
        new Notice(this.settings.locked ? 'Layout locked' : 'Layout unlocked');
      },
    });
  }

  async loadSettings() {
    const loaded = (await this.loadData()) || {};
    const base = defaultSettings();
    this.settings = Object.assign(base, loaded, {
      scope: Object.assign(base.scope, loaded.scope || {}),
      layout: loaded.layout || {},
      widgets: base.widgets,
    });
    for (const id of ORDER) {
      this.settings.widgets[id] = Object.assign(widgetDefaults(id), (loaded.widgets || {})[id] || {});
    }
  }

  async save() {
    await this.saveData(this.settings);
    window.clearTimeout(this._saveT);
    this._saveT = window.setTimeout(() => this.views().forEach((v) => v.rebuild()), 350);
  }

  async saveQuiet() {
    await this.saveData(this.settings);
  }

  views() {
    return this.app.workspace.getLeavesOfType(VIEW_TYPE).map((l) => l.view);
  }

  openSettings() {
    this.app.setting.open();
    this.app.setting.openTabById(this.manifest.id);
  }

  async activate() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (existing) return workspace.revealLeaf(existing);
    const leaf = workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    workspace.revealLeaf(leaf);
  }

  async ensureFile(path, template) {
    const norm = path.endsWith('.md') ? path : path + '.md';
    const found = this.app.vault.getAbstractFileByPath(norm);
    if (found instanceof TFile) return found;
    const dir = norm.split('/').slice(0, -1).join('/');
    if (dir && !(this.app.vault.getAbstractFileByPath(dir) instanceof TFolder)) {
      await this.app.vault.createFolder(dir).catch(() => {});
    }
    let content = '';
    if (template) {
      const tpl = this.app.vault.getAbstractFileByPath(
        template.endsWith('.md') ? template : template + '.md'
      );
      if (tpl instanceof TFile) content = await this.app.vault.cachedRead(tpl);
    }
    return this.app.vault.create(norm, content);
  }

  async appendTo(path, text, open) {
    const file = await this.ensureFile(path);
    const current = await this.app.vault.read(file);
    const sep = current.length && !current.endsWith('\n') ? '\n' : '';
    await this.app.vault.modify(file, current + sep + text + '\n');
    if (open) await this.app.workspace.getLeaf(false).openFile(file);
  }

  async completeTask(file, line) {
    const text = await this.app.vault.read(file);
    const lines = text.split('\n');
    if (!lines[line] || !/\[ \]/.test(lines[line])) return;
    lines[line] = lines[line].replace('[ ]', '[x]');
    await this.app.vault.modify(file, lines.join('\n'));
  }

  searchTag(tag) {
    const search = this.app.internalPlugins.getPluginById('global-search');
    if (search && search.instance) search.instance.openGlobalSearch('tag:' + tag);
    else new Notice('Enable the core Search plugin to browse tags.');
  }

  pomoDuration(phase) {
    const cfg = this.settings.widgets.pomodoro;
    if (phase === 'short') return (cfg.shortBreak || 5) * 60;
    if (phase === 'long') return (cfg.longBreak || 15) * 60;
    return (cfg.work || 25) * 60;
  }

  pomoPaint() {
    this.views().forEach((v) => v.pomoTick && v.pomoTick());
  }

  pomoToggle() {
    this.pomo.running = !this.pomo.running;
    this.pomoPaint();
  }

  pomoReset() {
    this.pomo.running = false;
    this.pomo.remaining = this.pomoDuration(this.pomo.phase);
    this.pomoPaint();
  }

  pomoStep() {
    if (!this.pomo.running) return;
    this.pomo.remaining -= 1;
    if (this.pomo.remaining <= 0) this.pomoAdvance(false);
    else this.pomoPaint();
  }

  async pomoAdvance(manual) {
    const cfg = this.settings.widgets.pomodoro;
    const p = this.pomo;
    const finished = p.phase;

    if (finished === 'work') {
      p.done += 1;
      if (!manual && cfg.logTo) {
        const stamp = moment().format('YYYY-MM-DD HH:mm');
        await this.appendTo(cfg.logTo, `- ${stamp} — focus round of ${cfg.work || 25} min`, false).catch(() => {});
      }
      p.phase = p.done % (cfg.cycles || 4) === 0 ? 'long' : 'short';
    } else {
      p.phase = 'work';
    }

    p.remaining = this.pomoDuration(p.phase);
    p.running = manual ? false : cfg.autoStart === true;
    if (!manual && cfg.notify !== false) {
      const label = { work: 'Focus', short: 'Short break', long: 'Long break' };
      new Notice(`${label[finished]} finished — ${label[p.phase].toLowerCase()} next`);
    }
    this.pomoPaint();
  }

  async openDated(day, cfg) {
    const folder = String((cfg && cfg.folder) || '').replace(/^\/+|\/+$/g, '');
    const name = day.format((cfg && cfg.format) || 'YYYY-MM-DD') + '.md';
    const file = await this.ensureFile(folder ? `${folder}/${name}` : name, cfg && cfg.template);
    await this.app.workspace.getLeaf(false).openFile(file);
  }
};
