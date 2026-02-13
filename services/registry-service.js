import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import multer from 'multer';

const app = express();
const PORT = process.env.REGISTRY_SERVICE_PORT || 3002;

app.use(cors());
app.use(express.json());

const CONTENT_DIR = path.resolve(process.cwd(), 'content');
const INGESTION_DIR = path.join(CONTENT_DIR, 'ingestion');
if (!fs.existsSync(INGESTION_DIR)) fs.mkdirSync(INGESTION_DIR, { recursive: true });

// Helper to ensure path is within CONTENT_DIR
const safePath = (requestedPath) => {
    // Remove leading slash if present to ensure path.join works relative to CONTENT_DIR
    const relativePath = requestedPath.startsWith('/') ? requestedPath.substring(1) : requestedPath;
    const absolute = path.join(CONTENT_DIR, relativePath);
    if (!absolute.startsWith(CONTENT_DIR)) throw new Error("Access Denied");
    return absolute;
};

// Setup storage for uploads (Direct to Ingestion)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, INGESTION_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// API: List Ingestion Queue
app.get('/api/ingestion/list', (req, res) => {
    try {
        const files = fs.readdirSync(INGESTION_DIR)
            .filter(f => f !== '.gitkeep')
            .map(f => ({
                filename: f,
                originalName: f.split('-').slice(1).join('-'),
                size: fs.statSync(path.join(INGESTION_DIR, f)).size,
                uploadedAt: new Date(parseInt(f.split('-')[0])).toISOString()
            }));
        res.json(files);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: Finalize Ingestion (Classify and Move)
app.post('/api/ingestion/finalize', (req, res) => {
    const { filename, type, campaignId, eventId, customTitle } = req.body;
    if (!filename || !type || !campaignId || !eventId) return res.status(400).json({ error: "Missing classification data" });

    const sourcePath = path.join(INGESTION_DIR, filename);
    if (!fs.existsSync(sourcePath)) return res.status(404).json({ error: "Source file not found" });

    try {
        const ext = path.extname(filename);
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const cleanTitle = customTitle || filename.split('-').slice(1).join('-').replace(ext, '');
        const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Final Destination: content/campaigns/{campaign}/{event}/{TYPE-DATE-SLUG.EXT}
        const targetDir = path.join(CONTENT_DIR, 'campaigns', campaignId, eventId);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const finalFilename = `${type.toUpperCase()}-${dateStr}-${slug}${ext}`;
        const targetPath = path.join(targetDir, finalFilename);

        fs.renameSync(sourcePath, targetPath);
        
        // If it's a markdown file, we might want to wrap it in frontmatter, but for now we just move.
        // Images/PDFs are moved directly.
        
        res.json({ success: true, path: targetPath.replace(CONTENT_DIR, '') });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: Bulk Upload
app.post('/api/upload', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    res.json({ 
        success: true, 
        count: req.files.length,
        files: req.files.map(f => ({ filename: f.filename, path: f.path.replace(CONTENT_DIR, '') }))
    });
});

// GET file content
app.get('/api/file', (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: "Missing path" });
    try {
        const fullPath = safePath(filePath);
        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found" });
        const content = fs.readFileSync(fullPath, 'utf-8');
        res.json({ content });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST update file
app.post('/api/file', (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) return res.status(400).json({ error: "Missing data" });
    try {
        const fullPath = safePath(filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content, 'utf-8');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CAMPAIGN EVENTS API (RESTful) ---

const CAMPAIGNS_DIR = path.resolve(CONTENT_DIR, 'campaigns');

// 1. LIST EVENTS
app.get('/api/community/:community/campaigns/:campaign/events', (req, res) => {
    const { campaign } = req.params;
    const campaignPath = path.join(CAMPAIGNS_DIR, campaign);
    
    try {
        if (!fs.existsSync(campaignPath)) return res.status(404).json({ error: "Campaign not found" });
        
        const events = fs.readdirSync(campaignPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const eventPath = path.join(campaignPath, dirent.name);
                const indexFile = path.join(eventPath, '_index.md');
                let meta = { id: dirent.name, title: dirent.name, path: eventPath.replace(CONTENT_DIR, '') };
                
                if (fs.existsSync(indexFile)) {
                    const content = fs.readFileSync(indexFile, 'utf-8');
                    const titleMatch = content.match(/title: "(.*)"/);
                    if (titleMatch) meta.title = titleMatch[1];
                }

                // Also list documents within this event
                meta.documents = fs.readdirSync(eventPath)
                    .filter(f => f.endsWith('.md') && f !== '_index.md')
                    .map(f => ({
                        id: f,
                        title: f.replace('.md', '').toUpperCase(),
                        path: path.join(eventPath, f).replace(CONTENT_DIR, '')
                    }));

                return meta;
            });
        res.json(events);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. CREATE EVENT
app.post('/api/community/:community/campaigns/:campaign/events', (req, res) => {
    const { campaign } = req.params;
    const { title, id } = req.body; // id is the slug
    if (!title || !id) return res.status(400).json({ error: "Missing title or id" });

    const eventPath = path.join(CAMPAIGNS_DIR, campaign, id);
    try {
        if (!fs.existsSync(eventPath)) fs.mkdirSync(eventPath, { recursive: true });
        const indexPath = path.join(eventPath, '_index.md');
        const content = `---\ntitle: "${title}"\ndate: "${new Date().toISOString()}"\nlayout: "section"\n---\n`;
        fs.writeFileSync(indexPath, content);
        res.status(201).json({ success: true, id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. GET EVENT DATA
app.get('/api/community/:community/campaigns/:campaign/events/:eventId', (req, res) => {
    const { campaign, eventId } = req.params;
    const eventPath = path.join(CAMPAIGNS_DIR, campaign, eventId, '_index.md');
    try {
        if (!fs.existsSync(eventPath)) return res.status(404).json({ error: "Event not found" });
        const content = fs.readFileSync(eventPath, 'utf-8');
        res.json({ id: eventId, content });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. UPDATE EVENT
app.put('/api/community/:community/campaigns/:campaign/events/:eventId', (req, res) => {
    const { campaign, eventId } = req.params;
    const { content } = req.body;
    const eventPath = path.join(CAMPAIGNS_DIR, campaign, eventId, '_index.md');
    try {
        if (!fs.existsSync(eventPath)) return res.status(404).json({ error: "Event not found" });
        fs.writeFileSync(eventPath, content, 'utf-8');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. DELETE EVENT
app.delete('/api/community/:community/campaigns/:campaign/events/:eventId', (req, res) => {
    const { campaign, eventId } = req.params;
    const eventPath = path.join(CAMPAIGNS_DIR, campaign, eventId);
    try {
        if (fs.existsSync(eventPath)) {
            fs.rmSync(eventPath, { recursive: true, force: true });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Event not found" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => { console.log(`[REGISTRY_SERVICE] Active on ${PORT}`); });