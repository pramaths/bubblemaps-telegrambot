import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Wait for the map to fully render
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const screenshot = await page.screenshot({ type: 'png' }) as Buffer;
    
    return screenshot;
  } finally {
    await browser.close();
  }
} 