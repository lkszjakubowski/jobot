import ScraperOptions from '../../interfaces/ScraperOptions';
import pptOptions from '../../scraper/options';
import {
  launchPuppeteer,
  navigateTo,
  crawlMultiple,
} from '../../scraper/helpers';
import { handleInput, scrapeLinks, scrapeOffer } from './just-join-it.services';

export default async function (options: ScraperOptions): Promise<void> {
  const { browser, page } = await launchPuppeteer(pptOptions);
  const { searchValue, maxRecords } = options;

  await navigateTo('https://justjoin.it/', page);

  await handleInput(searchValue, page);

  const links = await scrapeLinks(maxRecords, page);

  await browser.close();

  await crawlMultiple({ pages: links, scrapingFunction: scrapeOffer });
}
