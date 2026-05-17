import esbuild from "esbuild";

const { MITE_API_KEY, MITE_ACCOUNT_NAME } = process.env;

if (!MITE_API_KEY) {
  throw new Error("process.env.MITE_API_KEY missing");
}

if (!MITE_ACCOUNT_NAME) {
  throw new Error("process.env.MITE_ACCOUNT_NAME missing");
}

await esbuild.build({
  entryPoints: ["src/client/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  define: {
    "process.env.MITE_API_KEY": JSON.stringify(MITE_API_KEY),
    "process.env.MITE_ACCOUNT_NAME": JSON.stringify(MITE_ACCOUNT_NAME),
  },
});
