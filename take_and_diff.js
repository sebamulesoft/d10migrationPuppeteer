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
    let pageResult = [];
    let pageTest = [uri];
    for(const breakPoint of testConfig.breakPoints){
      try{ 
        console.log('testing ' + uri + ' ' + breakPoint.name)
        const breakPointResult = await compareScreenshots(uri, breakPoint);
        pageResult = pageResult.concat(breakPointResult)
      }
      catch(err){
          console.log(err);
      }
    }
    console.log(pageTest.concat(pageResult))
    testResults.push(pageTest.concat(pageResult));
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
    const prodResponse = await page.goto(prodPath + uri, {waitUntil: "networkidle0"});

    let prodResponseStatus;
    if(prodResponse)
      prodResponseStatus = await prodResponse.status();
    
    const contentAreaBase = await page.$('.full-width-row')
    const boundingBoxBase = await contentAreaBase.boundingBox();

    await autoscroll(boundingBoxBase.height, page);
    await page.waitForTimeout(5000)
    await autoscroll(0, page);
    await page.waitForTimeout(5000)

    const updatedBoundingBoxBase = await contentAreaBase.boundingBox();

    //REMOVE NAV AND AUTOPILOT, FOOTER
    let clipYProd;
    let prodMainNav;
    if(breakPoint.name == 'desktop'){
      prodMainNav = await page.$('.desktop-header')
    }else
      prodMainNav = await page.$('.mobile-header')

    if(prodMainNav){
      const prodMainNavBoundingBox = await prodMainNav.boundingBox();
      clipYProd = prodMainNavBoundingBox.height;
    }
    const autopilot = await page.$('.brightedge-links');
    if(autopilot)
    await page.addStyleTag({content: '.brightedge-links { display: none !important; }'});
    const prodFooter = await page.$('.ms-com-content-footer')
    if(prodFooter)
    await page.addStyleTag({content: '.ms-com-content-footer { display: none !important; }'});
    

    await page.screenshot({ path: basePath , clip:{height :boundingBoxBase.height, width : boundingBoxBase.width, x:0, y: clipYProd}});
   
    const devResponse = await page.goto(devPath + uri,{waitUntil: "domcontentloaded"});

    

    let devResponseStatus;
    if(devResponse)
      devResponseStatus = await devResponse.status();

      await autoscroll(boundingBoxBase.height, page);
      await page.waitForTimeout(5000)
      await autoscroll(0, page);
      await page.waitForTimeout(5000)

    //REMOVE ERROR MESSAGE, NAV, HELMET, FOOTER
    let clipY = 0;
    const errorMessage = await page.$('.messages--error');
    if(errorMessage)
      await page.addStyleTag({content: '.messages--error { display: none !important; }'});
    const helmet = await page.$('.ms-com-helmet')
    if(helmet){
      const helmetBoundingBox = await helmet.boundingBox();
      clipY += helmetBoundingBox.height;
    }
    let devMainNav;
    if(breakPoint.name == 'desktop'){
      devMainNav = await page.$('.desktop-header')
    }else
      devMainNav = await page.$('.mobile-header')
    
    if(devMainNav){
      const devNavBoundingBox = await devMainNav.boundingBox();
      clipY += devNavBoundingBox.height;
    }
    if(prodFooter)
    await page.addStyleTag({content: '.ms-com-content-footer { display: none !important; }'});
    

    const screenshotClip = {height :boundingBoxBase.height, width : boundingBoxBase.width, x:0 ,y: clipY};


   
    await page.screenshot({ path: comparePath, clip: screenshotClip });

    const base = PNG.sync.read(fs.readFileSync(basePath));
    const compare = PNG.sync.read(fs.readFileSync(comparePath));
    const { width, height } = base;
    const diff = new PNG({ width, height });

    const result = pixelmatch(base.data, compare.data, diff.data, width, height, { threshold: 0.5 });
    if (result > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      return [prodResponseStatus, devResponseStatus,  result]
    } else {
      return [prodResponseStatus, devResponseStatus, result]
    }
  } catch (e) {
      return [e.message.split('\n')[0], null, null]
  } finally {
    await browser.close();
  }
};

//helper function for autoscrolling the page as needed
async function disableLazyLoading(page){
	await page.$$eval('img', imgs => imgs.map(img => img.removeAttribute('loading')));
}

async function autoscroll(direction, page){
	await page.evaluate(async direction => {
		await scrollTo({
      top: direction,
      left: 0,
      behavior: "smooth",
    })
	}, direction)
}
