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

let db;
let isConnected = false;

async function connectToDatabase() {
    if (isConnected) return db;
    
    try {
        await mongoClient.connect();
        db = mongoClient.db(DB_NAME);
        isConnected = true;
        console.log('Connected to MongoDB');

        const collections = await db.listCollections().toArray();
        const collectionExists = collections.some(col => col.name === COLLECTION_NAME);
        if (!collectionExists) {
            await db.createCollection(COLLECTION_NAME);
            console.log('Collection created');
        }
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        setTimeout(connectToDatabase, 5000);
        throw error;
    }
}

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

    try {
        await connectToDatabase();
        const collection = db.collection(COLLECTION_NAME);

        if (pathname === '/contacts' && method === 'GET') {
            const contacts = await collection.find({}).toArray();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(contacts));
            return;
        }

        if (pathname === '/contacts' && method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const contact = JSON.parse(body);
                    const result = await collection.insertOne({
                        ...contact,
                        createdAt: new Date()
                    });
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ id: result.insertedId, ...contact }));
                } catch (error) {
                    console.error('Create contact error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to create contact' }));
                }
            });
            return;
        }

        if (pathname.startsWith('/contacts/') && method === 'DELETE') {
            const id = pathname.split('/')[2];
            try {
                const result = await collection.deleteOne({ _id: new ObjectId(id) });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ deleted: result.deletedCount > 0 }));
            } catch (error) {
                console.error('Delete contact error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to delete contact' }));
            }
            return;
        }

        if (pathname === '/admin' && method === 'GET') {
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

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));

    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database connection failed' }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});