import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import process from 'node:process';
import { URL } from 'node:url';

const reports = [];
let command = null;
const text =
  '# Тестовий файл\n\nВкладення з чату.\n\n' + 'Український текст документа.\n'.repeat(100);
const stream = 'BT /F1 18 Tf 40 740 Td (AP file preview test) Tj ET';
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
];
let pdf = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets
  .slice(1)
  .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
  .join('');
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:5586');
  if (url.pathname === '/qa/reports') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(reports));
    return;
  }
  if (url.pathname === '/qa/report' || url.pathname === '/qa/command') {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST') {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        const value = JSON.parse(body);
        if (url.pathname === '/qa/report') reports.push(value);
        else command = value;
        response.end('{}');
      });
    } else {
      response.end(JSON.stringify(command));
      command = null;
    }
    return;
  }
  if (url.pathname === '/files/expired.pdf') {
    response.statusCode = 403;
    response.setHeader('Content-Type', 'application/xml');
    response.end('<Error><Code>ExpiredSignature</Code></Error>');
    return;
  }
  if (url.pathname === '/files/sample.md' || url.pathname === '/files/sample.pdf') {
    const isPdf = url.pathname.endsWith('.pdf');
    response.setHeader('Content-Type', isPdf ? 'application/pdf' : 'text/plain');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="sample.${isPdf ? 'pdf' : 'md'}"`,
    );
    response.end(isPdf ? pdf : text);
    return;
  }
  if (url.pathname === '/files/broken.pdf') {
    response.statusCode = 404;
    response.setHeader('Content-Disposition', 'attachment; filename="broken.pdf"');
    response.end('Not found');
    return;
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Chat attachment QA</title><style>body{margin:0;padding:80px 20px 36px;font:18px system-ui;background:#f3f9f8}button,textarea{display:block;box-sizing:border-box;width:100%;padding:14px;margin:16px 0;font:inherit}button{background:white;border:1px solid #b4d8d3;border-radius:12px}textarea{min-height:120px}</style></head><body><h1>Тестовий чат</h1><p>Відкрий вкладення й повернися до цієї чернетки.</p><textarea id="draft">Чернетка залишається в чаті</textarea><button data-file="sample.md">Відкрити текстовий файл</button><button data-file="sample.pdf">Відкрити PDF</button><button data-file="broken.pdf">Відкрити недоступний файл</button><button data-file="expired.pdf">Відкрити прострочене посилання</button><p id="marker"></p><script>
  const marker=String(Date.now())+':'+Math.random(); document.querySelector('#marker').textContent='Сесія '+marker;
  const report=()=>fetch('/qa/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marker,draft:document.querySelector('#draft').value,url:location.pathname})}).catch(()=>{});
  document.querySelectorAll('[data-file]').forEach(button=>button.addEventListener('click',()=>{const a=document.createElement('a');a.href='/files/'+button.dataset.file+(button.dataset.file==='expired.pdf'?'?response-content-disposition=attachment%3B%20filename%3D%22expired.pdf%22':'');a.download=button.dataset.file;a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.click();}));
  report();setInterval(report,1000);
  setInterval(async()=>{try{const command=await(await fetch('/qa/command')).json();if(command){document.querySelector('[data-file="'+command.file+'"]').click();}}catch{}},300);
  if(new URLSearchParams(location.search).get('open'))setTimeout(()=>document.querySelector('[data-file="sample.'+new URLSearchParams(location.search).get('open')+'"]').click(),2000);
  </script></body></html>`);
}).listen(5586, '127.0.0.1', () =>
  process.stdout.write('File attachment QA http://127.0.0.1:5586\n'),
);
