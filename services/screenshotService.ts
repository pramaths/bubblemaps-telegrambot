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

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for a specific HTML element to be present in the DOM
    await Promise.all([
        page.waitForSelector('#circles', {timeout: 60000 }),
        // page.waitForSelector('.scanner-icon', {timeout: 60000 }),
        // page.waitForSelector('.material-icons', {timeout: 60000 }),
    ]); 
   
    
    const screenshot = await page.screenshot({ type: 'png' }) as Buffer;
    await browser.close();
    
    return screenshot;
  } catch (error) {
    console.error('Error generating screenshot:', error);
    return null;
  }
}; 

