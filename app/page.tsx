"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import logo from "./apple-icon.png";
import pairsFR from "@/data/pairsFR.json";
import pairsEN from "@/data/pairsEN.json";
import pairsES from "@/data/pairsES.json";
import pairsDE from "@/data/pairsAllemand.json";
import fr from "@/i18n/fr";
import en from "@/i18n/en";
import es from "@/i18n/es";
import de from "@/i18n/de";
import {
  createGame,
  type PairSet,
  type Player,
  type Theme,
} from "@/lib/game";

const translations = { fr, en, es, de };
const pairSets: Record<Language, PairSet> = {
  fr: pairsFR,
  en: pairsEN,
  es: pairsES,
  de: pairsDE,
};
const languageOptions = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
] as const;
type Language = keyof typeof translations;
const playerCounts = Array.from({ length: 10 }, (_, index) => index + 3);
const maxUndercoverCount = (nbPlayers: number, withMrWhite: boolean) =>
  withMrWhite
    ? Math.floor((nbPlayers - 3) / 2)
    : Math.floor((nbPlayers - 1) / 2);

function isLanguage(value: string | null): value is Language {
  return value !== null && Object.hasOwn(translations, value);
}

function formatText(
  text: string,
  values: Record<string, string | number>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));
}

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
  const [language, setLanguage] = useState<Language>("fr");
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const pairs = pairSets[language];
  const themes = Object.keys(pairs);
  const themeOptions: Theme[] = ["all", ...themes];
  const t = translations[language];
  const [theme, setTheme] = useState<Theme>(
    Object.keys(pairsFR)[0] ?? "all",
  );
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

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("undercover-language");
    if (isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
      setTheme(Object.keys(pairSets[savedLanguage])[0] ?? "all");
    }
    setLanguageLoaded(true);
  }, []);

  useEffect(() => {
    if (!languageLoaded) {
      return;
    }
    window.localStorage.setItem("undercover-language", language);
    document.documentElement.lang = language;
    document.title = t.pageTitle;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", t.pageDescription);
  }, [language, languageLoaded, t]);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setTheme((currentTheme) =>
      currentTheme === "all"
        ? currentTheme
        : Object.keys(pairSets[nextLanguage])[0] ?? "all",
    );
  }

  function startGame(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const game = createGame(
      theme,
      nbPlayers,
      nbUndercover,
      withMrWhite,
      pairs,
    );
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
            aria-label={t.homeLabel}
          >
            <Image className="brand-logo" src={logo} alt="" />
            UndercoverInfinite
          </button>
          <span className="header-note">{t.headerNote}</span>
        </header>

        {screen === "setup" && (
          <section className="setup-screen" aria-labelledby="page-title">
            <div className="intro">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {t.ready}
              </span>
              <h1 id="page-title">
                {t.heroLine1}
                <br />
                <span>{t.heroLine2}</span>
              </h1>
              <p>{t.introDescription}</p>
            </div>

            <form className="setup-card" onSubmit={startGame}>
              <div className="section-heading">
                <span className="section-number">01</span>
                <div>
                  <h2>{t.prepareGame}</h2>
                  <p>{t.passPhone}</p>
                </div>
              </div>

              <div className="form-fields">
                <div className="field">
                  <span className="field-label">{t.language}</span>
                  <CustomDropdown
                    label={t.language}
                    options={languageOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={language}
                    onChange={changeLanguage}
                  />
                </div>

                <div className="field">
                  <span className="field-label">{t.theme}</span>
                  <CustomDropdown
                    label={t.theme}
                    options={themeOptions.map((themeName) => ({
                      value: themeName,
                      label:
                        themeName === "all" ? t.allThemes : themeName,
                    }))}
                    value={theme}
                    onChange={setTheme}
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <span className="field-label">{t.players}</span>
                    <CustomDropdown
                      label={t.players}
                      options={playerCounts.map((count) => ({
                        value: count,
                        label: formatText(
                          count === 1 ? t.playerSingular : t.playerPlural,
                          { count },
                        ),
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
                    <span className="field-label">{t.undercover}</span>
                    <CustomDropdown
                      label={t.undercover}
                      options={Array.from(
                        {
                          length: maxUndercoverCount(nbPlayers, withMrWhite),
                        },
                        (_, index) => index + 1,
                      ).map((count) => ({
                        value: count,
                        label: formatText(
                          count === 1 ? t.playerSingular : t.playerPlural,
                          { count },
                        ),
                      }))}
                      value={nbUndercover}
                      onChange={setNbUndercover}
                    />
                  </div>
                </div>

                <div
                  className={`mr-white-option${nbPlayers < 5 ? " is-disabled" : ""}`}
                >
                  <span className="field-label">{t.mrWhite}</span>
                  <label className="mr-white-switch">
                    <span>{t.enableMrWhite}</span>
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
                      {t.mrWhiteAvailable}
                    </span>
                  )}
                </div>
              </div>

              <div className="setup-hint">
                <span aria-hidden="true">✳</span>
                {t.setupHint}
              </div>

              <button className="button button-primary start-button" type="submit">
                {t.launch}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <p className="footer-note">
              {formatText(t.phoneSummary, {
                players: formatText(
                  nbPlayers === 1 ? t.playerSingular : t.playerPlural,
                  { count: nbPlayers },
                ),
                undercover: nbUndercover,
                undercoverRole:
                  nbUndercover === 1 ? t.undercover : t.undercoverPlural,
              })}
              {withMrWhite ? ` · ${t.mrWhite}` : ""}
            </p>
          </section>
        )}

        {screen === "dealing" && (
          <section className="distribution-screen" aria-labelledby="page-title">
            <div className="distribution-heading">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {t.distribution}
              </span>
              <h1 id="page-title">
                {t.turnOf}
                <br />
                <span>
                  {formatText(t.playerNumber, { number: currentPlayer + 1 })}.
                </span>
              </h1>
              <p>{t.keepScreenPrivate}</p>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label={t.distributionProgress}
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
              {formatText(t.playerProgress, {
                current: currentPlayer + 1,
                total: players.length,
              })}
            </p>

            <div className={`word-card${isRevealed ? " is-revealed" : ""}`}>
              <span className="card-overline">
                {isRevealed ? t.revelation : t.yourTurn}
              </span>
              {isRevealed ? (
                players[currentPlayer].role === "mrwhite" ? (
                  <>
                    <p className="secret-word">{t.youAreMrWhite}</p>
                    <p className="card-caption">
                      {t.mrWhiteInstruction}
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
                    {t.hiddenWordInstruction}
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
                {t.revealWord}
                <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <button
                className="button button-dark action-button"
                type="button"
                onClick={advancePlayer}
              >
                {t.hideAndPass}
                <span aria-hidden="true">→</span>
              </button>
            )}

            <p className="privacy-note">
              <span aria-hidden="true">◉</span>
              {t.wordPrivacy}
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
              {t.everyoneReady}
            </span>
            <h1 id="page-title">
              {t.distributionTitle}
              <br />
              <span>{t.distributionFinished}</span>
            </h1>
            <p>{t.distributionDescription}</p>
            <button
              className="button button-primary action-button"
              type="button"
              onClick={startDiscussion}
            >
              {t.startDiscussion}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {screen === "discussion" && (
          <section className="round-screen" aria-labelledby="page-title">
            <div className="round-heading">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {formatText(t.round, { round: eliminated.length + 1 })}
              </span>
              <h1 id="page-title">
                {t.discussion}
                <br />
                <span>{t.speakNow}</span>
              </h1>
              <p>{t.discussionInstruction}</p>
            </div>

            <ol className="player-list discussion-list">
              {discussionOrder.map((playerIndex, orderIndex) => (
                <li className="player-row" key={playerIndex}>
                  <span className="player-number">
                    {String(orderIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="player-name">
                    {formatText(t.playerNumber, { number: playerIndex + 1 })}
                  </span>
                  {orderIndex === 0 && (
                    <span className="player-tag">{t.playerStarts}</span>
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
              {t.goToVote}
              <span aria-hidden="true">→</span>
            </button>
            <p className="privacy-note">
              <span aria-hidden="true">✳</span>
              {formatText(t.playersInGame, { count: discussionOrder.length })}
            </p>
          </section>
        )}

        {screen === "vote" && (
          <section className="round-screen" aria-labelledby="page-title">
            <div className="round-heading">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {formatText(t.round, { round: eliminated.length + 1 })}
              </span>
              <h1 id="page-title">
                {t.whoIsUndercover}
                <br />
                <span>{t.undercoverQuestion}</span>
              </h1>
              <p>{t.voteInstruction}</p>
            </div>

            <div
              className="player-list vote-list"
              role="group"
              aria-label={t.choosePlayerToEliminate}
            >
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
                    <span className="player-name">
                      {formatText(t.playerNumber, { number: playerIndex + 1 })}
                    </span>
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
              {formatText(t.eliminatePlayer, {
                number: selectedVote === null ? "…" : selectedVote + 1,
              })}
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
              {t.eliminationResult}
            </span>
            <h1 id="page-title">
              {formatText(t.playerNumber, { number: lastEliminated + 1 })}
              <br />
              <span>{t.playerEliminated}</span>
            </h1>
            <div className="result-role-card">
              <span className="card-overline">{t.roleWas}</span>
              <p className="result-role">
                {players[lastEliminated].role === "undercover"
                  ? t.undercover
                  : players[lastEliminated].role === "mrwhite"
                    ? t.mrWhite
                    : t.civil}
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
                  {t.guessCiviliansWord}
                </label>
                <input
                  autoComplete="off"
                  className="mr-white-guess-input"
                  id="mr-white-guess"
                  onChange={(event) => setMrWhiteGuess(event.target.value)}
                  placeholder={t.mrWhiteAnswerPlaceholder}
                  required
                  value={mrWhiteGuess}
                />
                <button
                  className="button button-primary action-button"
                  type="submit"
                  disabled={mrWhiteGuessCorrect !== null}
                >
                  {t.submit}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            {mrWhiteGuessCorrect !== null && (
              <p className="result-message" role="status">
                {mrWhiteGuessCorrect
                  ? t.correctGuess
                  : winner
                    ? t.wrongGuess
                    : t.wrongGuessContinues}
              </p>
            )}
            {winner &&
              !(players[lastEliminated].role === "mrwhite" &&
                mrWhiteGuessCorrect === true) && (
              <p className="result-message">
                {winner === "civil"
                  ? t.civiliansWin
                  : winner === "mrwhite"
                    ? t.mrWhiteWinsWithUndercover
                    : t.undercoverWins}
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
                {winner ? t.viewGameEnd : t.continueGame}
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
              {t.gameOver}
            </span>
            <h1 id="page-title">
              {winner === "civil"
                ? t.civilians
                : winner === "mrwhite"
                  ? t.mrWhite
                  : t.undercovers}
              <br />
              <span>
                {winner === "mrwhite" ? t.mrWhiteWon : t.teamWon}
              </span>
            </h1>

            <div className="final-words">
              <div className="result-role-card">
                <span className="card-overline">{t.civiliansWord}</span>
                <p className="result-role">{civilWord}</p>
              </div>
              <div className="result-role-card">
                <span className="card-overline">{t.undercoversWord}</span>
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
                  <span className="player-name">
                    {formatText(t.playerNumber, { number: playerIndex + 1 })}
                  </span>
                  <span className="player-tag">
                    {player.role === "mrwhite"
                      ? t.mrWhite
                      : player.role === "undercover"
                        ? t.undercover
                        : t.civil}
                  </span>
                </li>
              ))}
            </ol>

            <button
              className="button button-primary action-button"
              type="button"
              onClick={() => startGame()}
            >
              {t.replaySameSettings}
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
              {t.newGame}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}
        <footer className="site-footer">
          <span>UndercoverInfinite</span>
          <span>{t.footerNote}</span>
        </footer>
      </div>
    </main>
  );
}
