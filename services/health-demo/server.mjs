import { createServer } from "node:http";
import { createHealthPayload } from "./dist/health.js";

const port = Number(process.env.PORT ?? 3001);

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(createHealthPayload()));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CGN health demo listening on port ${port}`);
});
