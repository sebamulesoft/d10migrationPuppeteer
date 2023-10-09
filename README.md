# d10migrationPuppeteer
## Instalation
1. Clone the repo

   ```gh repo clone sebamulesoft/d10migrationPuppeteer```

2. Install dependencies

   ```npm install```

3. You will need to create a testConfig.js file at the root of the project, where you can config the pages to test and the breakpoints. In the following example we are testing the product Studio page and the homepage

```
exports.breakPoints = breakPoints = [
    {   name: 'desktop',
        width: 1792,
        height: 900,
        nav_prod: 72,
        nav_dev: 100
    },
    {
        name: 'mobile',
        width: 360,
        height: 649,
        nav_prod: 72,
        nav_dev: 104
    },
    {
        name: 'tablet',
        width: 768,
        height: 1024,
        nav_prod: 72,
        nav_dev: 104
    }
];

exports.uris = [
    'platform/studio',
    ''
   ];
```

4. You need to create a /screenshots folder at the root of the project to store the screenshots.

## Usage
1. Once you have the uris and the breakpoints configured in testConfig.js, you can just run ```node take_and_diff.js```
2. You can see the progress in the console. Testing 350 pages will take about 4 hours.
3. When the run is finished, you should have a testResults.csv in your root foldet, and you can upload it to Google Sheets for analysis.
4. Each row in the csv corresponds with a test, and the las number field represents the amount of diff pixels betwen dev and prod. It should be 0 for exact match.


