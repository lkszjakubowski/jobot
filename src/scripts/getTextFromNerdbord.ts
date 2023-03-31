import Bot from '../bot/Bot';
import Scraper from '../scraper/Scraper';

import fs from 'fs';

const bot = new Bot();
const scraper = new Scraper(bot);

export default async function (): Promise<void> {
  await bot.init();

  const text = await scraper.getText();

  fs.writeFile('./scrap-results/text.json', JSON.stringify(text), (err) => {
    if (err) throw err;
  });

  await bot.close();
}
