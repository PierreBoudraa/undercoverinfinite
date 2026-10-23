"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import logo from "./apple-icon.png";
import pairs from "@/data/pairs.json";
import { createGame, type Player, type Theme } from "@/lib/game";

const themes = Object.keys(pairs) as (keyof typeof pairs)[];
const themeOptions: Theme[] = ["all", ...themes];
const playerCounts = Array.from({ length: 10 }, (_, index) => index + 3);
const maxUndercoverCount = (nbPlayers: number, withMrWhite: boolean) =>
  withMrWhite
    ? Math.floor((nbPlayers - 3) / 2)
    : Math.floor((nbPlayers - 1) / 2);

type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

function CustomDropdown<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button
        ref={triggerRef}
        className="dropdown-trigger"
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{selectedOption?.label}</span>
        <span
          className={`dropdown-chevron${isOpen ? " is-open" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div
          className="dropdown-menu"
          id={dropdownId}
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => (
            <button
              className={`dropdown-option${option.value === value ? " is-selected" : ""}`}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <span className="dropdown-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>(themes[0]);
  const [nbPlayers, setNbPlayers] = useState(5);
  const [nbUndercover, setNbUndercover] = useState(1);
  const [withMrWhite, setWithMrWhite] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [civilWord, setCivilWord] = useState("");
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [discussionOrder, setDiscussionOrder] = useState<number[]>([]);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [lastEliminated, setLastEliminated] = useState<number | null>(null);
  const [winner, setWinner] = useState<
    "civil" | "undercover" | "mrwhite" | null
  >(null);
  const [mrWhiteGuess, setMrWhiteGuess] = useState("");
  const [mrWhiteGuessCorrect, setMrWhiteGuessCorrect] = useState<
    boolean | null
  >(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [screen, setScreen] = useState<
    "setup" | "dealing" | "complete" | "discussion" | "vote" | "result" | "end"
  >("setup");

  function startGame(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const game = createGame(theme, nbPlayers, nbUndercover, withMrWhite);
    setPlayers(game.players);
    setCivilWord(game.civilWord);
    setEliminated([]);
    setDiscussionOrder([]);
    setSelectedVote(null);
    setLastEliminated(null);
    setWinner(null);
    setMrWhiteGuess("");
    setMrWhiteGuessCorrect(null);
    setCurrentPlayer(0);
    setIsRevealed(false);
    setScreen("dealing");
  }

  function advancePlayer() {
    setIsRevealed(false);

    if (currentPlayer === players.length - 1) {
      setScreen("complete");
      return;
    }

    setCurrentPlayer((playerIndex) => playerIndex + 1);
  }

  function startDiscussion() {
    const alivePlayers = players
      .map((_, index) => index)
      .filter((index) => !eliminated.includes(index));

    for (let index = alivePlayers.length - 1; index > 0; index -= 1) {
      const otherIndex = Math.floor(Math.random() * (index + 1));
      [alivePlayers[index], alivePlayers[otherIndex]] = [
        alivePlayers[otherIndex],
        alivePlayers[index],
      ];
    }

    setDiscussionOrder(alivePlayers);
    setSelectedVote(null);
    setScreen("discussion");
  }

  function eliminateSelectedPlayer() {
    if (selectedVote === null) {
      return;
    }

    const eliminatedPlayers = [...eliminated, selectedVote];
    const remainingPlayers = players.filter(
      (_, index) => !eliminatedPlayers.includes(index),
    );
    const remainingUndercover = remainingPlayers.filter(
      (player) => player.role === "undercover",
    ).length;
    const remainingMrWhite = remainingPlayers.filter(
      (player) => player.role === "mrwhite",
    ).length;
    const remainingCivilians = remainingPlayers.filter(
      (player) => player.role === "civil",
    ).length;

    setLastEliminated(selectedVote);
    setEliminated(eliminatedPlayers);
    setSelectedVote(null);
    setMrWhiteGuess("");
    setMrWhiteGuessCorrect(null);
    setWinner(
      remainingUndercover + remainingMrWhite === 0
        ? "civil"
        : remainingUndercover + remainingMrWhite >= remainingCivilians
          ? remainingMrWhite > 0
            ? "mrwhite"
            : "undercover"
          : null,
    );
    setScreen("result");
  }

  function submitMrWhiteGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalize = (word: string) =>
      word
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase();
    const isCorrect = normalize(mrWhiteGuess) === normalize(civilWord);
    setMrWhiteGuessCorrect(isCorrect);
    if (isCorrect) {
      setWinner("mrwhite");
    }
  }

  return (
    <main className="game-shell">
      <div className="game-container">
        <header className="site-header">
          <button
            className="brand"
            type="button"
            onClick={() => {
              setScreen("setup");
              setIsRevealed(false);
            }}
            aria-label="UndercoverInfinite, accueil"
          >
            <Image className="brand-logo" src={logo} alt="" />
            UndercoverInfinite
          </button>
          <span className="header-note">Le jeu des mots cachés</span>
        </header>

        {screen === "setup" && (
          <section className="setup-screen" aria-labelledby="page-title">
            <div className="intro">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                Prêts à jouer ?
              </span>
              <h1 id="page-title">
                Un mot en commun.
                <br />
                <span>Un intrus parmi vous.</span>
              </h1>
              <p>
                Choisissez votre thème et distribuez les mots. Saurez-vous
                démasquer l&apos;Undercover ?
              </p>
            </div>

            <form className="setup-card" onSubmit={startGame}>
              <div className="section-heading">
                <span className="section-number">01</span>
                <div>
                  <h2>Préparez la partie</h2>
                  <p>Les joueurs se passent le téléphone à tour de rôle.</p>
                </div>
              </div>

              <div className="form-fields">
                <div className="field">
                  <span className="field-label">
                    Thème
                  </span>
                  <CustomDropdown
                    label="Thème"
                    options={themeOptions.map((themeName) => ({
                      value: themeName,
                      label:
                        themeName === "all" ? "Tous les thèmes" : themeName,
                    }))}
                    value={theme}
                    onChange={setTheme}
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <span className="field-label">
                      Joueurs
                    </span>
                    <CustomDropdown
                      label="Joueurs"
                      options={playerCounts.map((count) => ({
                        value: count,
                        label: `${count} joueurs`,
                      }))}
                      value={nbPlayers}
                      onChange={(count) => {
                        setNbPlayers(count);
                        const shouldIncludeMrWhite =
                          withMrWhite && count >= 5;
                        if (!shouldIncludeMrWhite) {
                          setWithMrWhite(false);
                        }
                        setNbUndercover((undercoverCount) =>
                          Math.min(
                            undercoverCount,
                            maxUndercoverCount(count, shouldIncludeMrWhite),
                          ),
                        );
                      }}
                    />
                  </div>

                  <div className="field">
                    <span className="field-label">
                      Undercover
                    </span>
                    <CustomDropdown
                      label="Undercover"
                      options={Array.from(
                        {
                          length: maxUndercoverCount(nbPlayers, withMrWhite),
                        },
                        (_, index) => index + 1,
                      ).map((count) => ({
                        value: count,
                        label: `${count} ${count === 1 ? "joueur" : "joueurs"}`,
                      }))}
                      value={nbUndercover}
                      onChange={setNbUndercover}
                    />
                  </div>
                </div>

                <div
                  className={`mr-white-option${nbPlayers < 5 ? " is-disabled" : ""}`}
                >
                  <span className="field-label">Mr White</span>
                  <label className="mr-white-switch">
                    <span>Activer Mr White</span>
                    <input
                      type="checkbox"
                      checked={withMrWhite}
                      disabled={nbPlayers < 5}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setWithMrWhite(enabled);
                        setNbUndercover((undercoverCount) =>
                          Math.min(
                            undercoverCount,
                            maxUndercoverCount(nbPlayers, enabled),
                          ),
                        );
                      }}
                    />
                    <span className="switch-track" aria-hidden="true" />
                  </label>
                  {nbPlayers < 5 && (
                    <span className="mr-white-hint">
                      Disponible à partir de 5 joueurs.
                    </span>
                  )}
                </div>
              </div>

              <div className="setup-hint">
                <span aria-hidden="true">✳</span>
                Chaque Undercover reçoit un mot différent de celui des civils.
              </div>

              <button className="button button-primary start-button" type="submit">
                Lancer
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <p className="footer-note">
              Un téléphone · {nbPlayers} joueurs · {nbUndercover}{" "}
              Undercover{nbUndercover > 1 ? "s" : ""}
              {withMrWhite ? " · Mr White" : ""}
            </p>
          </section>
        )}

        {screen === "dealing" && (
          <section className="distribution-screen" aria-labelledby="page-title">
            <div className="distribution-heading">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                Distribution des mots
              </span>
              <h1 id="page-title">
                Au tour de
                <br />
                <span>Joueur {currentPlayer + 1}.</span>
              </h1>
              <p>
                Assurez-vous que personne d&apos;autre ne regarde l&apos;écran.
              </p>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Progression de la distribution"
              aria-valuemin={0}
              aria-valuemax={players.length}
              aria-valuenow={currentPlayer + (isRevealed ? 1 : 0)}
            >
              {players.map((_, index) => (
                <span
                  className={`progress-segment${index < currentPlayer || (index === currentPlayer && isRevealed) ? " is-done" : ""}`}
                  key={index}
                />
              ))}
            </div>
            <p className="progress-label">
              Joueur {currentPlayer + 1} <span>/</span> {players.length}
            </p>

            <div className={`word-card${isRevealed ? " is-revealed" : ""}`}>
              <span className="card-overline">
                {isRevealed ? "Révélation" : "À toi de jouer"}
              </span>
              {isRevealed ? (
                players[currentPlayer].role === "mrwhite" ? (
                  <>
                    <p className="secret-word">Tu es Mr White</p>
                    <p className="card-caption">
                      Tu n’as pas de mot. Écoute les autres et devine-le !
                    </p>
                  </>
                ) : (
                  <p className="secret-word">
                    {players[currentPlayer].word}
                  </p>
                )
              ) : (
                <>
                  <div className="hidden-word" aria-hidden="true">
                    ••••••••
                  </div>
                  <p className="card-caption">
                    Appuie quand tu es seul à regarder.
                  </p>
                </>
              )}
            </div>

            {!isRevealed ? (
              <button
                className="button button-primary action-button"
                type="button"
                onClick={() => setIsRevealed(true)}
              >
                Touche pour voir ton mot
                <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <button
                className="button button-dark action-button"
                type="button"
                onClick={advancePlayer}
              >
                Cacher et passer au suivant
                <span aria-hidden="true">→</span>
              </button>
            )}

            <p className="privacy-note">
              <span aria-hidden="true">◉</span>
              Le mot disparaît avant le prochain joueur.
            </p>
          </section>
        )}

        {screen === "complete" && (
          <section className="complete-screen" aria-labelledby="page-title">
            <span className="complete-icon" aria-hidden="true">
              ✓
            </span>
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Tout le monde est prêt
            </span>
            <h1 id="page-title">
              La distribution
              <br />
              <span>est terminée.</span>
            </h1>
            <p>
              Les mots sont distribués. À vous de discuter et de trouver
              l&apos;Undercover !
            </p>
            <button
              className="button button-primary action-button"
              type="button"
              onClick={startDiscussion}
            >
              Commencer la discussion
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {screen === "discussion" && (
          <section className="round-screen" aria-labelledby="page-title">
            <div className="round-heading">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                Tour {eliminated.length + 1}
              </span>
              <h1 id="page-title">
                Discussion
                <br />
                <span>À vous de parler.</span>
              </h1>
              <p>
                Chacun donne un indice à son tour. Voici l&apos;ordre de passage
                aléatoire.
              </p>
            </div>

            <ol className="player-list discussion-list">
              {discussionOrder.map((playerIndex, orderIndex) => (
                <li className="player-row" key={playerIndex}>
                  <span className="player-number">
                    {String(orderIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="player-name">Joueur {playerIndex + 1}</span>
                  {orderIndex === 0 && (
                    <span className="player-tag">Commence</span>
                  )}
                </li>
              ))}
            </ol>

            <button
              className="button button-primary action-button"
              type="button"
              onClick={() => {
                setSelectedVote(null);
                setScreen("vote");
              }}
            >
              Passer au vote
              <span aria-hidden="true">→</span>
            </button>
            <p className="privacy-note">
              <span aria-hidden="true">✳</span>
              Joueurs en jeu : {discussionOrder.length}
            </p>
          </section>
        )}

        {screen === "vote" && (
          <section className="round-screen" aria-labelledby="page-title">
            <div className="round-heading">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                Tour {eliminated.length + 1}
              </span>
              <h1 id="page-title">
                Qui est
                <br />
                <span>l&apos;Undercover ?</span>
              </h1>
              <p>
                Choisissez ensemble le joueur que vous souhaitez éliminer.
              </p>
            </div>

            <div className="player-list vote-list" role="group" aria-label="Choisir le joueur à éliminer">
              {players.map((_, playerIndex) => {
                if (eliminated.includes(playerIndex)) {
                  return null;
                }

                const isSelected = selectedVote === playerIndex;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`player-row vote-option${isSelected ? " is-selected" : ""}`}
                    key={playerIndex}
                    onClick={() => setSelectedVote(playerIndex)}
                    type="button"
                  >
                    <span className="player-number">
                      {String(playerIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="player-name">Joueur {playerIndex + 1}</span>
                    <span className="vote-indicator" aria-hidden="true">
                      {isSelected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="button button-dark action-button"
              type="button"
              disabled={selectedVote === null}
              onClick={eliminateSelectedPlayer}
            >
              Éliminer Joueur{" "}
              {selectedVote === null ? "…" : selectedVote + 1}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {screen === "result" && lastEliminated !== null && (
          <section className="complete-screen result-screen" aria-labelledby="page-title">
            <span className="complete-icon" aria-hidden="true">
              {winner ? (winner === "civil" ? "✦" : "◉") : "!"}
            </span>
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Résultat de l&apos;élimination
            </span>
            <h1 id="page-title">
              Joueur {lastEliminated + 1}
              <br />
              <span>a été éliminé.</span>
            </h1>
            <div className="result-role-card">
              <span className="card-overline">Son rôle était</span>
              <p className="result-role">
                {players[lastEliminated].role === "undercover"
                  ? "Undercover"
                  : players[lastEliminated].role === "mrwhite"
                    ? "Mr White"
                    : "Civil"}
              </p>
              {players[lastEliminated].role !== "mrwhite" && (
                <p className="result-word">
                  {players[lastEliminated].word}
                </p>
              )}
            </div>

            {players[lastEliminated].role === "mrwhite" && (
              <form
                className="mr-white-guess-form"
                onSubmit={submitMrWhiteGuess}
              >
                <label className="field-label" htmlFor="mr-white-guess">
                  Devine le mot des civils
                </label>
                <input
                  autoComplete="off"
                  className="mr-white-guess-input"
                  id="mr-white-guess"
                  onChange={(event) => setMrWhiteGuess(event.target.value)}
                  required
                  value={mrWhiteGuess}
                />
                <button
                  className="button button-primary action-button"
                  type="submit"
                  disabled={mrWhiteGuessCorrect !== null}
                >
                  Valider
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            {mrWhiteGuessCorrect !== null && (
              <p className="result-message" role="status">
                {mrWhiteGuessCorrect
                  ? "Bonne réponse ! Mr White gagne la partie."
                  : winner
                    ? "Mauvaise réponse."
                    : "Mauvaise réponse. La partie continue."}
              </p>
            )}
            {winner &&
              !(players[lastEliminated].role === "mrwhite" &&
                mrWhiteGuessCorrect === true) && (
              <p className="result-message">
                {winner === "civil"
                  ? "Tous les imposteurs ont été éliminés. Les civils gagnent !"
                  : winner === "mrwhite"
                    ? "Les imposteurs sont au moins aussi nombreux que les civils. Mr White gagne avec les Undercover !"
                    : "Les imposteurs sont au moins aussi nombreux que les civils. Les Undercover gagnent !"}
              </p>
            )}

            {players[lastEliminated].role !== "mrwhite" ||
            mrWhiteGuessCorrect !== null ? (
              <button
                className="button button-primary action-button"
                type="button"
                onClick={() => {
                  if (winner) {
                    setScreen("end");
                  } else {
                    startDiscussion();
                  }
                }}
              >
                {winner ? "Voir la fin de partie" : "Continuer la partie"}
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </section>
        )}

        {screen === "end" && (
          <section className="complete-screen result-screen" aria-labelledby="page-title">
            <span className="complete-icon" aria-hidden="true">
              {winner === "civil" ? "✦" : "◉"}
            </span>
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Fin de partie
            </span>
            <h1 id="page-title">
              {winner === "civil"
                ? "Les civils"
                : winner === "mrwhite"
                  ? "Mr White"
                  : "Les Undercover"}
              <br />
              <span>{winner === "mrwhite" ? "a gagné !" : "ont gagné !"}</span>
            </h1>

            <div className="final-words">
              <div className="result-role-card">
                <span className="card-overline">Mot des civils</span>
                <p className="result-role">{civilWord}</p>
              </div>
              <div className="result-role-card">
                <span className="card-overline">Mot des Undercover</span>
                <p className="result-role">
                  {players.find((player) => player.role === "undercover")?.word}
                </p>
              </div>
            </div>

            <ol className="player-list final-player-list">
              {players.map((player, playerIndex) => (
                <li className="player-row" key={playerIndex}>
                  <span className="player-number">
                    {String(playerIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="player-name">Joueur {playerIndex + 1}</span>
                  <span className="player-tag">
                    {player.role === "mrwhite"
                      ? "Mr White"
                      : player.role === "undercover"
                        ? "Undercover"
                        : "Civil"}
                  </span>
                </li>
              ))}
            </ol>

            <button
              className="button button-primary action-button"
              type="button"
              onClick={() => startGame()}
            >
              Rejouer avec les mêmes réglages
              <span aria-hidden="true">↻</span>
            </button>
            <button
              className="button button-dark action-button"
              type="button"
              onClick={() => {
                setScreen("setup");
                setIsRevealed(false);
              }}
            >
              Nouvelle partie
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}
        <footer className="site-footer">
          <span>UndercoverInfinite</span>
          <span>À vous de jouer.</span>
        </footer>
      </div>
    </main>
  );
}
