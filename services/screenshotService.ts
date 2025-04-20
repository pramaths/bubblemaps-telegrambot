// import puppeteer from 'puppeteer';

// import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer';


import { getMapIframeUrl, getMapAvailability } from './bubblemapsService';

export const generateMapScreenshot = async (chain: string, token: string): Promise<Buffer | null> => {
  try {
    // First check if the map is available
    const availability = await getMapAvailability(chain, token);
    if (availability.status !== 'OK' || !availability.availability) {
      console.error('Map not available:', availability.message || 'Unknown reason');
      return null;
    }

    const url = getMapIframeUrl(chain, token);
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    // const browser = await puppeteer.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: chromium.headless,
    // });
  

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the map to fully render
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const screenshot = await page.screenshot({ type: 'png' }) as Buffer;
    await browser.close();
    
    return screenshot;
  } catch (error) {
    console.error('Error generating screenshot:', error);
    return null;
  }
}; 