import { promises as fs } from 'fs';
import JobOffer from '../interfaces/JobOffer';

export default async function (file: string, data: JobOffer) {
  try {
    const fileExists = await fs
      .access(file)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      await fs.writeFile(file, '[]', 'utf-8');
    }

    const existingData = await fs.readFile(file, 'utf-8');
    const parsedData = JSON.parse(existingData);

    parsedData.push(data);

    await fs.writeFile(file, JSON.stringify(parsedData, null, 2), 'utf-8');
  } catch (error) {
    console.log('Error: ', error);
  }
}
