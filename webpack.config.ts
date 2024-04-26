import path from "path";
import { Configuration } from "webpack";

const config: Configuration = {
  entry: "./src/main.ts",
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: [{
            loader: 'ts-loader',
            options: {
                configFile: "tsconfig.json"
            }
        }],
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "main.js",
    libraryTarget: 'commonjs2'
  },
  target: "node",
  optimization: {
    minimize: true
  }
};

export default config;