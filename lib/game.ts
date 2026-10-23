export type Theme = string | "all";
export type PlayerRole = "civil" | "undercover" | "mrwhite";
export type PairSet = Record<string, string[][]>;

export type Player = {
  role: PlayerRole;
  word: string;
};

export type Game = {
  players: Player[];
  civilWord: string;
};

export function createGame(
  theme: Theme,
  nbPlayers: number,
  nbUndercover: number,
  withMrWhite: boolean,
  pairs: PairSet,
): Game {
  if (!Number.isSafeInteger(nbPlayers) || nbPlayers <= 2) {
    throw new RangeError("nbPlayers must be an integer greater than or equal to 3.");
  }

  if (typeof withMrWhite !== "boolean") {
    throw new TypeError("withMrWhite must be a boolean.");
  }

  if (withMrWhite && nbPlayers < 5) {
    throw new RangeError("Mr White can only be enabled with at least 5 players.");
  }

  if (
    !Number.isSafeInteger(nbUndercover) ||
    nbUndercover < 1 ||
    nbUndercover >= nbPlayers
  ) {
    throw new RangeError(
      "nbUndercover must be an integer between 1 and nbPlayers - 1.",
    );
  }

  const nbMrWhite = withMrWhite ? 1 : 0;
  const nbCivilians = nbPlayers - nbUndercover - nbMrWhite;
  if (nbCivilians <= nbUndercover + nbMrWhite) {
    throw new RangeError(
      "The number of civilians must be greater than the number of Undercover and Mr White players combined.",
    );
  }

  const themePairs = theme === "all" ? Object.values(pairs).flat() : pairs[theme];
  if (!themePairs || themePairs.length === 0) {
    throw new Error(`Theme "${theme}" does not contain any word pairs.`);
  }

  const pair = themePairs[Math.floor(Math.random() * themePairs.length)];
  let civilWord = pair[0];
  let undercoverWord = pair[1];

  if (Math.random() < 0.5) {
    [civilWord, undercoverWord] = [undercoverWord, civilWord];
  }

  const roles: PlayerRole[] = Array.from(
    { length: nbPlayers },
    (_, index) =>
      index < nbUndercover
        ? "undercover"
        : withMrWhite && index === nbUndercover
          ? "mrwhite"
          : "civil",
  );

  for (let index = roles.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(Math.random() * (index + 1));
    [roles[index], roles[otherIndex]] = [roles[otherIndex], roles[index]];
  }

  return {
    players: roles.map((role) => ({
      role,
      word:
        role === "civil"
          ? civilWord
          : role === "undercover"
            ? undercoverWord
            : "",
    })),
    civilWord,
  };
}
