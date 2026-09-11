# ZCore Mission Control

A dashboard for your Obsidian vault. Every panel is a widget you can drag,
resize and scope to specific folders. Nothing else is required — no Dataview,
no Templater, no Homepage.

![grid](https://raw.githubusercontent.com/zcore/obsidian-zcore-mission-control/main/docs/screenshot.png)

## Widgets

| Widget | Shows |
|---|---|
| Vault uplink | notes, real word count, links, tags, open/completed tasks, orphans, unresolved links |
| Quick capture | appends a line to an inbox note, optionally as a task |
| Pomodoro timer | focus rounds with short and long breaks, round counter, optional log to a note |
| Activity feed | most recently modified files |
| Recent notes | notes touched within N days, by modified or created date |
| Open tasks | unchecked checkboxes across the scope, tickable from the panel |
| Agenda | daily notes for the current week; click a missing day to create it |
| Hourly activity | files touched per hour |
| Folder distribution | note count per folder, groupable by depth |
| Tag cloud | most used tags; click to search |
| Hub notes | notes with the most inbound links |
| Needs review | notes without inbound links (or fully orphaned) |
| Calendar | month grid shaded by activity; click a day to open or create it |
| Contribution map | 8–53 weeks of activity as a heatmap |
| Shortcuts | buttons that open a note, or create it if missing |

## Header

The dashboard title and the date underneath are both editable in the settings.
The date takes any Moment.js format, with presets for long, medium, ISO
(`YYYY-MM-DD`) and numeric styles, or no date at all.

## Layout

The dashboard is a 12-column grid. Drag a widget by its title bar, resize it
from the bottom-right corner. When a widget is dropped onto another, the ones
underneath are pushed down and the whole grid is compacted upwards, so nothing
ever overlaps. Layout is saved per vault.

Lock the layout from the settings, or with the *Toggle layout lock* command.

## Scoping

Two levels:

- **Global scope** — whole vault, only certain folders, or everything except
  certain folders.
- **Per widget** — each widget can inherit the global scope or define its own.
  This is how you count open tasks from one project folder while the rest of
  the dashboard still covers the vault.

Open a widget's own settings with the gear on its title bar, or from
*Settings → ZCore Mission Control → Widgets → Configure*.

## Commands

- Open dashboard
- Open dashboard settings
- Toggle layout lock

## Install

### From the community list

Settings → Community plugins → Browse → search for *ZCore Mission Control*.

### Manually

Copy `main.js`, `manifest.json` and `styles.css` into
`<vault>/.obsidian/plugins/zcore-mission-control/`, then enable the plugin.

## Development

The plugin is a single dependency-free CommonJS file, so no build step is
required: `src/main.js` is the source and `main.js` is what Obsidian loads.

```bash
npm install     # only needed for the release bundle
npm run build   # minifies src/main.js into main.js
```

To work against a live vault, symlink or copy the repo folder into
`<vault>/.obsidian/plugins/zcore-mission-control/` and use *Reload app without
saving* after each change.

## Releasing

Tag a version and push it; the GitHub Action attaches `main.js`,
`manifest.json` and `styles.css` to the release, which is what the Obsidian
community list expects.

```bash
npm version 2.0.1
git push --follow-tags
```

## Companion theme

The optional **ZCore Mission Control** theme provides the gold-and-blue palette
this dashboard was designed against. Without it, the plugin falls back to the
current theme's variables and still looks native.

## License

MIT
