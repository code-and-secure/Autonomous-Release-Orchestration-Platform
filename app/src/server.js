const http = require("node:http");

const PORT = process.env.PORT || 8080;
const APP_VERSION = process.env.APP_VERSION || "dev";

function requestHandler(req, res) {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: APP_VERSION }));
    return;
  }

  if (req.url === "/ready") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ready: true }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      service: "autonomous-release-platform",
      message: "Deployment pipeline target service is running",
      version: APP_VERSION,
    })
  );
}

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { requestHandler };
