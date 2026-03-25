const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const token = JSON.parse(data).token;
    if (!token) return console.error('Login failed', data);
    
    const allocReq = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/auto-allocate-cocos',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res2 => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('ALLOCATION RESULT:', JSON.parse(data2));
        process.exit(0);
      });
    });
    allocReq.end();
  });
});
req.write(JSON.stringify({ instituteId: 'admin001', password: 'admin123', role: 'admin' }));
req.end();
