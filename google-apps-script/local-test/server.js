// Local stand-in for the published web app: the real Code.gs running on in-memory sheets.
const http = require('http'); const { makeEnv } = require('./gas');
const port = +(process.argv[2] || 8792);
let env;
function reset(now) { env = makeEnv({ now: now || null }); env.sandbox.setup(); env.state.sheets.Staff.rows[1][1] = 'local-test-pass'; env.sandbox.setupMenu(); }
reset(process.argv[3]);
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    const send = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    try {
      if (req.url.startsWith('/__test')) {              // test hooks only: never part of the real backend
        const q = JSON.parse(body || '{}');
        if (q.reset) reset(q.now);
        if (q.now !== undefined && !q.reset) env.state.now = q.now;
        if (q.fail !== undefined) env.state.fail = q.fail;
        if (q.delay !== undefined) env.state.delay = q.delay;
        if (q.set) q.set.forEach(([sheet, r, c, v]) => { env.state.sheets[sheet].rows[r][c] = v; });
        return send({ mails: env.state.mails.map(m => q.full ? m : ({ to: m.to, subject: m.subject })), bookings: env.rows('Bookings'), logs: env.state.logs });
      }
      if (req.method === 'GET') return send(env.get());
      if (env.state.fail === 'down') { res.statusCode = 500; return res.end('down'); }
      const out = JSON.parse(env.sandbox.doPost({ postData: { contents: body } }).getContent());
      setTimeout(() => send(out), env.state.delay || 60);
    } catch (e) { res.statusCode = 500; res.end(String(e && e.stack || e)); }
  });
}).listen(port, () => console.log('mock booking backend on ' + port));
