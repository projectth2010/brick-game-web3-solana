const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/app.js', // Ensure this points to the correct entry file
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public'), // Output the bundled file in the public folder
    },
    resolve: {
        extensions: ['.js', '.json'], // Resolve these extensions automatically
        
        fallback: {
            "stream": require.resolve("stream-browserify"),
            "assert": require.resolve("assert/"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "os": require.resolve("os-browserify/browser")
          }
        },
      
        plugins: [
          new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser'
          })
        ],
    mode: 'development', // Add this to avoid warnings
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    
    devServer: {
        contentBase: path.join(__dirname, 'public'), // Serve files from the public directory
        compress: true,
        port: 9000,
    },
};
