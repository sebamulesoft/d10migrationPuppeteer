// take_and_diff.js

'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const testConfig = require('./testConfig.js');

const devPath = 'https://developerd8dev.prod.acquia-sites.com/';
const prodPath = 'https://developerd8.prod.acquia-sites.com/';
const testResults = [];

(async () => {
  for(const uri of testConfig.uris){
    for(const breakPoint of testConfig.breakPoints){
      try{ 
        console.log('testing ' + uri + ' ' + breakPoint.name)
        const pageResult = await compareScreenshots(uri, breakPoint);
        console.log(pageResult)
        testResults.push(pageResult);
      }
      catch(err){
          console.log(err);
      }
    }
  }

  const testResultCSV = testResults.map(row => row.join(',')).join('\n');

  fs.writeFile('testResults.csv', testResultCSV, 'utf8', function (err) {
      if (err) {
          console.log('Some error occured - file either not saved or corrupted file saved.', err);
      } else{
          console.log('It\'s saved!');
      }
  });
})();

async function compareScreenshots (uri, breakPoint)  {
  const browser = await puppeteer.launch({headless:"new"});
  const folderPath = './screenshots/' + uri.replaceAll('/', '_')
  const basePath = folderPath + breakPoint.name + 'prodBase.png'
  const comparePath = folderPath + breakPoint.name + 'devCompare.png';
  const diffPath = folderPath +  breakPoint.name + 'diff.png'
  try {
    const page = await browser.newPage();
    await page.setViewport({width:breakPoint.width, height:breakPoint.height})
    const prodResponse = await page.goto(prodPath + uri);
    let prodResponseStatus;
    if(prodResponse)
      prodResponseStatus = await prodResponse.status();
    
    const contentAreaBase = await page.$('.block-mule-foundation-content')
    const boundingBoxBase = await contentAreaBase.boundingBox();

    await page.screenshot({ path: basePath , clip:{height :boundingBoxBase.height, width : boundingBoxBase.width, x:0, y: breakPoint.nav_prod}});
   
    const screenshotClip = {height :boundingBoxBase.height, width : boundingBoxBase.width, x:0 ,y: breakPoint.nav_dev};

    const devResponse = await page.goto(devPath + uri);
    let devResponseStatus;
    if(devResponse)
      devResponseStatus = await devResponse.status();
   
    await page.screenshot({ path: comparePath, clip: screenshotClip });

    const base = PNG.sync.read(fs.readFileSync(basePath));
    const compare = PNG.sync.read(fs.readFileSync(comparePath));
    const { width, height } = base;
    const diff = new PNG({ width, height });

    const result = pixelmatch(base.data, compare.data, diff.data, width, height, { threshold: 0.5 });
    if (result > 0) {
      //console.log(`Different pixels: ${result}`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      return [uri, prodResponseStatus, devResponseStatus, breakPoint.name, result]
    } else {
      return [uri, prodResponseStatus, devResponseStatus, breakPoint.name, result]
    }
  } catch (e) {
      return [uri, breakPoint.name,e.message.split('\n')[0]]
  } finally {
    await browser.close();
  }
};
