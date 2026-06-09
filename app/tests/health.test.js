const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { requestHandler } = require("../src/server");

test("GET /health returns status ok", async () => {
  const server = http.createServer(requestHandler);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const payload = await new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}/health`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ statusCode: res.statusCode, body }));
      })
      .on("error", reject);
  });

  assert.equal(payload.statusCode, 200);
  assert.deepEqual(JSON.parse(payload.body).status, "ok");

  await new Promise((resolve) => server.close(resolve));
});
