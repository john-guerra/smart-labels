import { readFileSync } from "fs";
import node from "@rollup/plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import terser from "@rollup/plugin-terser";
// import babel from "rollup-plugin-babel";
import json from "@rollup/plugin-json";
import meta from "./package.json" assert { type: "json" };

// Extract copyrights from the LICENSE.
const copyrights = readFileSync("./LICENSE", "utf-8")
  .split(/\n/g)
  .filter((line) => /^copyright\s+/i.test(line))
  .map((line) => line.replace(/^copyright\s+/i, ""));

const filename = "smartLabels";

// Observable Plot style
const config = {
  input: "src/index.js",
  external: ["d3"],
  output: {
    indent: false,
    banner: `// ${meta.name} v${meta.version} Copyright ${copyrights.join(", ")}`,
    extend: true,
    globals: {
      "d3": "d3",    
    },
    name: "smartLabels",
  },
  plugins: [commonjs(), json(), node()],
};

export default [
  {
    ...config,
    output: {
      ...config.output,
      format: "umd",
      file: `dist/${filename}.js`,
    },
  },
  {
    ...config,
    output: {
      ...config.output,
      format: "es",
      file: `dist/${filename}.es.js`,
    },
  },
  {
    ...config,
    output: {
      ...config.output,
      format: "umd",
      file: `dist/${filename}.min.js`,
    },
    plugins: [
      ...config.plugins,
      terser({
        output: {
          preamble: config.output.banner,
        },
      }),
    ],
  },
];
