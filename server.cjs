const { createServer } = require("node:http");
const next = require("next");

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((request, response) => handle(request, response)).listen(port, hostname, () => {
      console.log(`EG Scholarships is listening on ${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to start EG Scholarships", error);
    process.exitCode = 1;
  });
