const http = require('http');
const { MongoClient, ObjectId } = require('mongodb');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'phonebook';
const COLLECTION_NAME = 'contacts';

const mongoClient = new MongoClient(MONGODB_URI);

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/contacts' && method === 'GET') {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);
      const contacts = await collection.find({}).toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(contacts));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Database error' }));
    } finally {
      await mongoClient.close();
    }
    return;
  }

  if (pathname === '/contacts' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const contact = JSON.parse(body);
        await mongoClient.connect();
        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        const result = await collection.insertOne({
          ...contact,
          createdAt: new Date()
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: result.insertedId, ...contact }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to create contact' }));
      } finally {
        await mongoClient.close();
      }
    });
    return;
  }

  if (pathname.startsWith('/contacts/') && method === 'DELETE') {
    const id = pathname.split('/')[2];
    try {
      await mongoClient.connect();
      const db = mongoClient.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ deleted: result.deletedCount > 0 }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete contact' }));
    } finally {
      await mongoClient.close();
    }
    return;
  }

 if (pathname === '/admin' && method === 'GET') {
  try {
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const contacts = await collection.find({}).toArray();
    
    let tableRows = '';
    contacts.forEach(contact => {
      const id = contact._id ? contact._id.toString() : '';
      const name = contact.name || '';
      const phone = contact.phone || '';
      const createdAt = contact.createdAt ? new Date(contact.createdAt).toLocaleString() : '';
      
      tableRows += `
          <tr>
              <td>${id}</td>
              <td>${name}</td>
              <td>${phone}</td>
              <td>${createdAt}</td>
          </tr>`;
    });
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Просмотр базы данных</title>
    <style>
        body { font-family: Arial; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Просмотр базы данных - Контакты</h1>
    <p><strong>Всего контактов:</strong> ${contacts.length}</p>
    <table>
        <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Дата создания</th>
        </tr>
        ${tableRows}
    </table>
    <br>
    <a href="/">Вернуться к телефонной книге</a>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    console.error('Admin error:', error);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Ошибка базы данных</h1>');
  } finally {
    await mongoClient.close();
  }
  return;
}

if (pathname === '/' && method === 'GET') {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('Файл не найден');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    }
  });
  return;
}

if (pathname === '/app.js' && method === 'GET') {
  const filePath = path.join(__dirname, 'public', 'app.js');
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end('Файл не найден');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(content);
    }
  });
  return;
}

if (pathname === '/app.js' && method === 'GET') {
  const filePath = path.join(__dirname, 'public', 'app.js');
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(content);
    }
  });
  return;
}

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});