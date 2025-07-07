const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const path = require('path');
const PORT = process.env.PORT || 3000;

let slugs = [];

// Middleware zur Umleitung von soft-encyclopedia.net auf www.soft-encyclopedia.net
app.use((req, res, next) => {
  if (req.headers.host === 'soft-encyclopedia.net') {
    return res.redirect(301, `https://www.soft-encyclopedia.net${req.url}`);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/add-slug', (req, res) => {
  const { slug } = req.body;
  slugs.push(slug);
  sendNewSlugEvent(slug);
  res.status(200).send('Slug hinzugefügt');
});

function sendNewSlugEvent(slug) {
  httpServer.emit('newSlug', slug);
}

function sendClearSlugsEvent() {
  httpServer.emit('clearSlugs');
}

app.get('/sse/slugs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const slugListener = (slug) => {
    res.write(`data: ${JSON.stringify(slug)}\n\n`);
  };

  const clearListener = () => {
    res.write(`event: clearSlugs\n`);
    res.write(`data: {}\n\n`);
  };

  httpServer.on('newSlug', slugListener);
  httpServer.on('clearSlugs', clearListener);

  req.on('close', () => {
    httpServer.off('newSlug', slugListener);
    httpServer.off('clearSlugs', clearListener);
  });
});

// Route zum Initialisieren/Leeren der Slug-Liste
app.get('/api/reset-slugs', (req, res) => {
  slugs = [];
  sendClearSlugsEvent();
  res.status(200).send('Slugs zurückgesetzt und Event gesendet');
});

// Route für anzeige.html
app.get('/anzeige.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'anzeige.html'));
});

// Catch-all Route für die Umleitung auf index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Debugging für neue Slugs
httpServer.on('newSlug', slug => {
  console.log('Neuer Slug empfangen:', slug);
});
