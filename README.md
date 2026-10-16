# TaskFlow — Interactive Kanban Task Board & Workspace Pipeline

A responsive task management workspace built with HTML5, CSS3, and vanilla JavaScript for the GetIntern Week 3 milestone: **DOM Engines & Dynamic State**.

## Features

- Premium dark dashboard with task statistics.
- Three workflow columns: Pending, In Progress, and Completed.
- Dynamically created task cards.
- Create, edit, delete, and move tasks.
- Native drag-and-drop between columns.
- Search by title, description, or category.
- Filter by priority and status.
- Sort by creation date or due date.
- Browser `localStorage` persistence.
- Responsive desktop, tablet, and mobile layouts.
- Accessible labels, keyboard focus, modal Escape handling, and reduced-motion support.
- Safe rendering of user-entered text with `textContent`.

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Browser localStorage
- Native HTML Drag and Drop API

No frontend framework or third-party library is required.

## File structure

```text
interactive-kanban-workspace/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Run locally

1. Download or clone this repository.
2. Open the folder in Visual Studio Code.
3. Install the **Live Server** extension if it is not already installed.
4. Right-click `index.html`.
5. Choose **Open with Live Server**.
6. The application opens in your browser. Create a task and refresh the page to confirm that local persistence works.

You can also open `index.html` directly in a modern browser; Live Server is recommended during development.

## DOM methods demonstrated

### `document.createElement()`

The `createTaskCard(task)` function creates each task card and its child elements programmatically. Task cards are not hardcoded in the HTML document.

### `appendChild()`

New cards are appended to the Pending column using `appendChild()`. The `moveTask(taskId, newStatus)` function uses `appendChild()` to move the **existing DOM node** into another column instead of recreating it for each status transition.

### `element.remove()`

The `deleteTask(taskId)` function removes a task card from the active DOM using `element.remove()`, then removes the corresponding task object from application state and saves the updated collection.

### Event delegation

Card actions are handled by a click listener on the board. This avoids attaching a separate click listener to every individual action button.

## Persistence

Tasks are stored as JSON under the key `taskflow.workspace.tasks.v1` in the browser's localStorage. The application stores task data, not DOM nodes. When the page loads, it validates saved data and builds the cards again from the task objects.

Because localStorage is browser- and origin-specific, saved tasks are not automatically shared between devices or browsers. Clearing browser site data can remove saved tasks.

## Testing checklist

- [ ] Add a task and confirm it appears in Pending.
- [ ] Move a task to In Progress and then Completed.
- [ ] Move a completed task back to Pending.
- [ ] Edit a task and confirm no duplicate card appears.
- [ ] Delete a task and confirm the card disappears.
- [ ] Search by title and description.
- [ ] Apply priority and status filters together.
- [ ] Change each sorting option.
- [ ] Refresh the page and confirm tasks persist.
- [ ] Clear completed tasks after confirming the prompt.
- [ ] Test keyboard focus and Escape-key modal closing.
- [ ] Test the layout at desktop and mobile widths.
- [ ] Check the browser console for errors.

## GitHub repository setup

1. Sign in to GitHub and create a repository named `interactive-kanban-workspace`.
2. Set the repository visibility to **Public**.
3. Upload `index.html`, `style.css`, `app.js`, and `README.md` to the repository root.
4. Commit the files.
5. Open the repository page and confirm that the files are visible without signing in.

## Deployment

### Option A: GitHub Pages

1. Open the public repository.
2. Go to **Settings → Pages**.
3. Under the build/deployment source, select **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then save.
5. Wait for GitHub Pages to publish the site.
6. Open the URL shown in the Pages settings and test the live app.

### Option B: Netlify

1. Sign in to Netlify and choose **Add new site / Import an existing project**.
2. Connect the public GitHub repository.
3. Leave the build command empty because this is a static site.
4. Set the publish directory to the repository root (`.`).
5. Deploy and open the URL provided by Netlify.

### Option C: Vercel

1. Sign in to Vercel and import the public GitHub repository.
2. Select the framework preset **Other**.
3. Leave the build command empty and use the repository root as the output directory if prompted.
4. Deploy and open the generated URL.

Deployment interfaces can change, so follow the current labels shown by the selected platform.

## Screenshots

Add actual screenshots here after capturing them from your running application. Do not use placeholder screenshots as evidence of a deployed application.

## Submission

The GetIntern brief requires both:
- Public GitHub repository URL.
- Live hosted deployment URL.

Submit these through the official GetIntern submission form. The brief says PDF uploads are not accepted. Confirm the final deadline and form details against the official internship communication.
