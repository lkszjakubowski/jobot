import ScraperOptions from '../interfaces/ScraperOptions';
import scrapeJustJoinIt from '../bot/just-join-it/just-join-it.main';

export default async function (options: ScraperOptions): Promise<void> {
  await scrapeJustJoinIt(options);
}
