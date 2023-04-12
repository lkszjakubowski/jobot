export default interface JobOffer {
  title: string;
  description: string;
  company: string;
  salaryFrom: string;
  salaryTo: string;
  currency: string;
  offerURL: string;
  technologies: string[];
  addedAt: string;
}
