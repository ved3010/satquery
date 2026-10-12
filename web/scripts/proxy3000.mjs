import http from "http";

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: 3001,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad gateway: Next.js dev server on 3001 not ready yet.");
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Port 3000 proxy forwarding to http://127.0.0.1:3001");
});
