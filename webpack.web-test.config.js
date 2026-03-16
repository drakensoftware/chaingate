const path = require('path');

/**
 * Minimal webpack config used ONLY by the no-polyfills test.
 *
 * target: 'web'  →  webpack 5 will NOT polyfill Node built-ins.
 * If any source file or dependency pulls in a Node module (buffer,
 * crypto, fs, vm, …) the build will fail with a Module not found error.
 */
module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/index.ts'),
  target: 'web',
  output: {
    path: path.resolve(__dirname, '.web-build-test'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
        exclude: /node_modules/,
      },
    ],
  },
};
