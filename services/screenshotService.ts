<<<<<<< HEAD
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
=======
// import puppeteer from 'puppeteer';

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';


>>>>>>> 6c0777e0cdf7ad8f44e347a3d0bec3124e926e2d
import { getMapIframeUrl, getMapAvailability } from './bubblemapsService';

export async function generateMapScreenshot(chain: string, token: string): Promise<Buffer | null> {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
  
  try {
    // First check if the map is available
    const availability = await getMapAvailability(chain, token);
    if (availability.status !== 'OK' || !availability.availability) {
      console.error('Map not available:', availability.message || 'Unknown reason');
      return null;
    }

    const url = getMapIframeUrl(chain, token);
<<<<<<< HEAD
=======
    // const browser = await puppeteer.launch({
    //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
    //   headless: true
    // });

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  

>>>>>>> 6c0777e0cdf7ad8f44e347a3d0bec3124e926e2d
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the map to fully render
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const screenshot = await page.screenshot({ type: 'png' }) as Buffer;
    
    return screenshot;
  } finally {
    await browser.close();
  }
} 