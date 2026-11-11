import { buildApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const app = buildApp();
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => console.log(`Merito Tuition API on http://localhost:${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
