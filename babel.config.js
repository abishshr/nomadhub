module.exports = function (api) {
    api.cache(true);

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module:react-native-dotenv',
                {
                    moduleName: '@env',
                    path: '.env',
                    blocklist: null,
                    allowlist: ['GOOGLE_API_KEY', 'OPENWEATHER_API_KEY', 'NEWSAPI_KEY', 'OPENAI_API_KEY'],
                    safe: false,
                    allowUndefined: true,
                },
            ]
        ],
    };
};