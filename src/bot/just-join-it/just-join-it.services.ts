import { Page, ElementHandle } from 'puppeteer';
import { Cluster } from 'puppeteer-cluster';
import JobOffer from '../../interfaces/JobOffer';
import {
  allOffersSelector,
  singleOfferSelector,
  inputSelector,
  offerDetailsSelectors,
} from './just-join-it.selectors';
import { extractItems, delay } from '../../scraper/helpers';
import writeToJson from '../../utils/writeToJson';

export async function handleInput(
  searchValue: string,
  page: Page
): Promise<void> {
  console.log(`Searching for '${searchValue}' offers...`);

  const inputElement: ElementHandle = await page.waitForSelector(inputSelector);

  await inputElement.click();
  await inputElement.type(searchValue);

  await delay(1000);

  await inputElement.focus();
  await page.keyboard.press('Enter');

  await delay(1000);
}

export async function scrapeLinks(
  number: number,
  page: Page
): Promise<string[]> {
  console.log(`Scraping ${number} first links...`);

  const links: Set<string> = new Set();

  let scrollPosition = 0;
  const scrollableHeight = await page.$eval(
    allOffersSelector,
    (el) => el.scrollHeight
  );
  const visibleHeight = await page.$eval(
    allOffersSelector,
    (el) => el.clientHeight
  );

  while (scrollPosition < scrollableHeight && links.size < number) {
    const scrapedItems = await extractItems({
      page,
      targetSelector: singleOfferSelector,
      searchedElementSelector: 'a',
      searchedElementAttr: 'href',
    });

    for (let item of scrapedItems) {
      links.add(item);
    }

    await page.$eval(allOffersSelector, (el) => {
      el.scrollBy(0, el.clientHeight);
    });

    scrollPosition += visibleHeight;
    await delay(1000);
  }

  return links.size < number
    ? [...links].slice(0, -1)
    : [...links].slice(0, number);
}

const scrapeOffer = async ({ page, data: url }): Promise<void> => {
  await page.goto(url);

  const jobOffer: JobOffer[] = await page.$$eval(
    offerDetailsSelectors.wrapper,
    (elements: HTMLElement[]) =>
      elements.map((element) => {
        const salaryElement = element.querySelector<HTMLElement>(
          offerDetailsSelectors.salary
        );
        let salaryFrom: string, salaryTo: string, currency: string;

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
          title: element.querySelector<HTMLElement>(offerDetailsSelectors.title)
            .innerText,
          description: element
            .querySelector<HTMLElement>(offerDetailsSelectors.description)
            .textContent.replace(/\n/g, ''),
          company: element.querySelector<HTMLElement>(
            offerDetailsSelectors.company
          ).innerText,
          salaryFrom: salaryFrom,
          salaryTo: salaryTo,
          currency: currency,
          offerURL: element.querySelector<HTMLAnchorElement>(
            offerDetailsSelectors.offerURL
          ).href,
          technologies: [
            ...element.querySelectorAll<HTMLElement>(
              offerDetailsSelectors.technologies
            ),
          ].map((el) => el.textContent),
          addedAt: element.querySelector<HTMLElement>(
            offerDetailsSelectors.addedAt
          ).innerText,
        };
      })
  );

  if (jobOffer.length > 0) {
    const file = '../../../scrap-results/just-join-it';
    await writeToJson(file, jobOffer[0]);
  }
};

export async function scrapeCluster(links: string[]): Promise<void> {
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
