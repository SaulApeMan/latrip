# BlizzCon 2026 Trip Planner

A responsive, one-page Los Angeles trip planner built with plain HTML, CSS, and JavaScript. It has eight daily schedules, a “To Visit” list, a planning checklist, and a data-driven map. The starter content is intentionally made of clearly labeled placeholders.

## Edit the trip

All shared trip content lives in **`trip-data.js`**.

1. Open `trip-data.js` in any text editor.
2. Replace placeholder values in `meta`, `days`, `toVisit`, and `checklist`.
3. For real schedule or list entries, change `placeholder: true` to `placeholder: false`.
4. Save the file and refresh `index.html` in a browser.

Each day’s `date` value supplies the smaller date line beneath its navigation
tab. The day schedules, To Visit list, and checklist appear as separate
top-level views.

Each daily schedule item uses this shape:

```js
{
  time: "Add time",
  place: "Add activity or place",
  note: "Add a short note",
  placeholder: true
}
```

Use Los Angeles local time in the `time` field. Add, remove, or reorder items by editing their array order.

Confirmed flights and other immovable commitments use the day’s `fixedBlocks`
array. These render as large timeline boundaries without exposing a generic
fixed-block builder in the normal planner UI:

```js
{
  kind: "travel",
  label: "Flight arrival · LAX",
  startTime: "20:05",
  endTime: "",
  note: "Confirmed travel detail",
  dayBoundary: "starts-after" // use "ends-before" for a departure boundary
}
```

Times use 24-hour `HH:MM` values in the data file and are displayed in
12-hour Los Angeles local time. A `starts-after` block sits before activities;
an `ends-before` block sits after them.

Places added with **Add from To Visit** use a stable reference to the master
place record instead of copying its details:

```js
{
  time: "TBD",
  placeId: "master-place-id",
  note: "",
  placeholder: false
}
```

Every To Visit entry therefore has a unique `id`. Renaming the master place
updates its referenced day entries automatically. In edit mode, a referenced
place can be removed or moved directly to another day.

To show a To Visit place on the LA Map, add verified coordinates and an optional
short marker label:

```js
{
  id: "place-name",
  place: "Place name",
  note: "Concise To Visit context",
  category: "Place category",
  categoryKey: "food", // food | shop | animals | sightseeing | science
  icon: "F",
  officialUrl: "https://official.example/",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Place+name",
  extraLinks: [
    { label: "Useful resource", url: "https://resource.example/" }
  ],
  estimatedTicket: "$50 · confirm",
  estimatedParking: "$20 · confirm",
  coordinates: { lat: 34.0000, lng: -118.0000 },
  mapLabel: "Short map label",
  placeholder: false
}
```

Category badges use letters consistently in To Visit and on the map:
`A` Animals, `F` Food, `H` generalized Hotel, `S` Shop, `M` Museum /
Science, and `L` Landmark / venue. The Hotel record remains map-only and
deliberately anonymous. The To Visit badges are view-only filters: select one
to show its category and select it again to restore all places.

Use `extraLinks` only for concise, useful supporting actions such as a live
schedule or visitor guide. These links appear alongside the standard Official
Site and Google Reviews actions.

Ticket and parking values are editable planning estimates shown in To Visit.
Keep useful qualifiers in the text, such as `general admission`, `dynamic
pricing`, or `confirm`. Do not assume special exhibits, events, added fees, or
taxes are included unless the value explicitly says so.

Places without both coordinates remain in To Visit but are not pinned. The map
uses Leaflet and OpenStreetMap tiles, so its background requires an internet
connection; the rest of the planner remains usable if tiles cannot load.

The LA Map day filter reads referenced `placeId` entries from each day in their
existing schedule-array order. For two or more mapped stops, it requests a
driving route from the public OSRM demo service and caches identical requests
for the browser session. The planner never reorders or optimizes stops. If the
route service is unavailable, the map shows a dashed visual planning line,
labels it as non-routed, and keeps an **Open in Google Maps** directions link.
Zero- and one-stop days are handled without making a routing request.

## Preview locally

You can double-click `index.html`; no install or build step is required. For the closest match to GitHub Pages, serve the folder with any simple local web server.

## Publish with GitHub Pages later

When the site is ready:

1. Create a GitHub repository and add these files to its default branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the default branch and the root (`/`) folder, then save.

GitHub will show the public URL after the first deployment finishes. This project uses relative file paths, so it works from a repository subpath without changes.

## Files

- `index.html` — page structure
- `styles.css` — visual design and responsive layout
- `trip-data.js` — all editable trip content
- `app.js` — tabs, editing, export, and checklist behavior
- `makrura_red_1000.png` — square Makrura Red hero visual
