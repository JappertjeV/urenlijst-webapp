// Een fout waarvan de melding voor de gebruiker bedoeld is ("Eindtijd moet na
// begintijd liggen."). Alleen deze meldingen gaan terug naar de browser; elke
// andere fout (Prisma, bugs) kan interne details bevatten zoals schema- en
// querystukken en wordt daarom vervangen door een algemene melding.
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
