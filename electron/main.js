// Windows exe wrapper: opens the Expo web export (dist/) in a desktop window.
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Serve dist/ on localhost so localStorage has a stable origin (file:// origins are fragile).
function serve(dir) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf", ".ico": "image/x-icon" };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, "index.html");
      res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream");
      fs.createReadStream(f).pipe(res);
    });
    // Fixed port keeps the localStorage origin (and so keys/history) the same on every launch.
    server.listen(47213, "127.0.0.1", () => resolve(47213));
  });
}

async function create() {
  const port = await serve(path.join(__dirname, "..", "dist"));
  const win = new BrowserWindow({ width: 480, height: 820, title: "License Generator", autoHideMenuBar: true });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(create);
app.on("window-all-closed", () => app.quit());
