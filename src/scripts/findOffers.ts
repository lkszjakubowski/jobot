import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { Cluster } from 'puppeteer-cluster';
import ScraperOptions from '../interfaces/ScraperOptions';
import JobOffer from '../interfaces/JobOffer';
import writeToJson from '../helpers/writeToJson';

const pptOptions = {
  headless: false,
  args: [`--window-size=1920,1080`, '--no-sandbox'],
};

const selector = 'div.css-ic7v2w';

async function delay(miliseconds: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, miliseconds);
  });
}

async function navigateTo(url: string, page: Page): Promise<void> {
  console.log(`Navigating to: ${url} ...`);

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.setViewport({ width: 1920, height: 1080 });
}

async function extractItems(page: Page): Promise<string[]> {
  const items: string[] = await page.$$eval(
    'div.css-ic7v2w > div > div',
    (elements: HTMLElement[]) =>
      elements.map((element) => element.querySelector('a').href)
  );

  return items;
}

async function scrapeItems(maxRecords: number, page: Page): Promise<string[]> {
  console.log(`Scraping ${maxRecords} first links...`);

  const items: Set<string> = new Set();

  let scrollPosition = 0;
  const scrollableHeight = await page.$eval(
    `${selector}`,
    (el) => el.scrollHeight
  );
  const visibleHeight = await page.$eval(
    `${selector}`,
    (el) => el.clientHeight
  );

  while (scrollPosition < scrollableHeight && items.size < maxRecords) {
    const scrapedItems = await extractItems(page);

    for (let item of scrapedItems) {
      items.add(item);
    }

    await page.$eval(`${selector}`, (el) => {
      el.scrollBy(0, el.clientHeight);
    });

    scrollPosition += visibleHeight;
    await delay(1000);
  }

  return items.size < maxRecords
    ? [...items].slice(0, -1)
    : [...items].slice(0, maxRecords);
}

async function handleInput(searchValue: string, page: Page): Promise<void> {
  console.log(`Searching for '${searchValue}' offers...`);

  const inputElement: ElementHandle = await page.waitForSelector(
    'input[type=text]'
  );

  await inputElement.click();
  await inputElement.type(searchValue);

  await delay(1000);

  await inputElement.focus();
  await page.keyboard.press('Enter');

  await delay(1000);
}

const scrapeOffer = async ({ page, data: url }): Promise<void> => {
  await page.goto(url);

  const jobOffer: JobOffer[] = await page.$$eval(
    '.css-1pc9k2p',
    (elements: HTMLElement[]) =>
      elements.map((element) => {
        const salaryElement = element.querySelector<HTMLElement>('.css-a2pcn2');
        let salaryFrom, salaryTo, currency;

        if (salaryElement.innerText.startsWith('Undisclosed')) {
          salaryFrom = 'Undisclosed';
          salaryTo = 'Undisclosed';
          currency = '';
        } else {
          const salaryText = salaryElement.innerText.replace(/\s/g, '');
          if (salaryText.includes('-')) {
            salaryFrom = salaryText.split('-')[0];
            salaryTo = salaryText.split('-')[1].match(/(\d+)/)[0];
            currency = salaryText.split('-')[1].slice(-3);
          } else {
            salaryFrom = salaryText.split(' ')[0];
            salaryTo = '';
            currency = salaryText.split(' ')[1];
          }
        }

        return {
          title: element.querySelector<HTMLElement>('.css-1id4k1').innerText,
          description: element
            .querySelector<HTMLElement>('.css-p1hlmi')
            .textContent.replace(/\n/g, ''),
          company: element.querySelector<HTMLElement>('a.css-l4opor').innerText,
          salaryFrom: salaryFrom,
          salaryTo: salaryTo,
          currency: currency,
          offerURL: element.querySelector<HTMLAnchorElement>(
            '#offer-apply-container a'
          ).href,
          technologies: [
            ...element.querySelectorAll<HTMLElement>('.css-1eroaug'),
          ].map((el) => el.textContent),
          addedAt: element.querySelector<HTMLElement>(
            'div.css-1kgdb8a > div:nth-child(4) > div.css-1ji7bvd'
          ).innerText,
        };
      })
  );

  if (jobOffer.length > 0) {
    const file = './scrap-results/offers-data.json';
    await writeToJson(file, jobOffer[0]);
  }
};

async function scrapeCluster(links: string[]): Promise<void> {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    monitor: true,
  });

  cluster.on('taskerror', (err, data) => {
    console.log(`Error crawling ${data}: ${err.message}`);
  });

  for (const link of links) {
    cluster.queue(link, scrapeOffer);
  }

  await cluster.idle();
  await cluster.close();
}

export default async function (options: ScraperOptions): Promise<void> {
  const browser: Browser = await puppeteer.launch(pptOptions);
  const page: Page = await browser.newPage();

  const { searchValue, maxRecords, url } = options;

  await navigateTo(url, page);

  await handleInput(searchValue, page);

  const links = await scrapeItems(maxRecords, page);

  await browser.close();

  await scrapeCluster(links);
}
