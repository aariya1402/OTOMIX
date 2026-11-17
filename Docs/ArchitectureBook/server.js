'use strict';

// Simple HTTP server for ArchitectureBook with PowerShell execution API
// Run: node Docs/ArchitectureBook/server.js
// Then open http://localhost:3000 in browser (VS Code Go Live)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BOOK = __dirname;
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.md': 'text/markdown'
};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function executeCommand(command) {
  return new Promise((resolve) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    // Deep verify can take longer due to test runs
    const isDeepVerify = args.includes('deep-verify');
    const timeout = isDeepVerify ? 300000 : 60000; // 5 minutes for deep-verify, 1 minute for others
    
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout + stderr,
        code
      });
    });
    
    child.on('error', (err) => {
      resolve({
        success: false,
        output: err.message,
        code: -1
      });
    });
    
    // Timeout
    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        output: 'Command timed out after ' + (timeout/1000) + ' seconds',
        code: -1
      });
    }, timeout);
  });
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // API endpoint for PowerShell execution
  if (req.url === '/api/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { command } = JSON.parse(body);
        if (!command) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, output: 'No command provided' }));
          return;
        }
        
        console.log('[API] Executing:', command);
        const result = await executeCommand(command);
        console.log('[API] Result:', result.success ? 'OK' : 'FAILED', result.code);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, output: err.message }));
      }
    });
    return;
  }
  
  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(BOOK, filePath);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(BOOK)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    serveFile(res, filePath, contentType);
  });
});

server.listen(PORT, () => {
  console.log(`ArchitectureBook server running at http://localhost:${PORT}`);
  console.log(`Serving from: ${BOOK}`);
  console.log(`Root: ${ROOT}`);
});

module.exports = server;