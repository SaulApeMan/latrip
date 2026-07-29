# LA Trip Planner

A responsive, one-page Los Angeles trip planner built with plain HTML, CSS, and JavaScript. It has seven daily schedules, a “To Visit” list, and a planning checklist. The starter content is intentionally made of clearly labeled placeholders.

## Edit the trip

All shared trip content lives in **`trip-data.js`**.

1. Open `trip-data.js` in any text editor.
2. Replace placeholder values in `meta`, `days`, `toVisit`, and `checklist`.
3. For real schedule or list entries, change `placeholder: true` to `placeholder: false`.
4. Save the file and refresh `index.html` in a browser.

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

## Edit in the browser

Open `index.html` and select **Edit planner**. Browser edits are saved locally on that device. Select **Download trip-data.js** to export them, then replace the project’s existing `trip-data.js` with the downloaded file before sharing or publishing.

Checklist ticks are also stored in the browser. **Reset browser edits** restores the content from the current `trip-data.js`.

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
