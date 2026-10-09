import http from "http";

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: 3001,
    path: req.url,
    method: req.method,
    headers: req.headers,
