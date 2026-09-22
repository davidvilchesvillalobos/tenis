const state = {
  appTitle: 'Marcador de tenis',
  category: 'Partido de tenis',
  players: ['Jugador 1', 'Jugador 2'],
  warnings: [0, 0],
  bestOf: 3,
  finalSetMode: 'super',
  games: [0, 0],
  sets: [[], []],
  points: [0, 0],
  serverIndex: null,
  tossWinnerIndex: null,
  tossComplete: false,
  tiebreakPointCount: 0,
  history: [],
  matchOver: false,
  winnerIndex: null,
  matchStartTime: null,
  matchDuration: 0,
  setPaused: false,
  sideChangeNotice: '',
  sideChangePaused: false
};

const pointLabels = ['0', '15', '30', '40'];
const SUPER_TIEBREAK_TARGET = 10;
const SET_TIEBREAK_TARGET = 7;
let pendingPointPlayer = null;
let timerInterval = null;
const elements = {
  scoreGrid: document.querySelector('#scoreGrid'),
  settingsButton: document.querySelector('#settingsButton'),
  settingsDialog: document.querySelector('#settingsDialog'),
  settingsForm: document.querySelector('#settingsForm'),
  appTitle: document.querySelector('#appTitle'),
  matchCategory: document.querySelector('#matchCategory'),
  appTitleInput: document.querySelector('#appTitleInput'),
  categoryInput: document.querySelector('#categoryInput'),
  playerOneInput: document.querySelector('#playerOneInput'),
  playerTwoInput: document.querySelector('#playerTwoInput'),
  cancelSettingsButton: document.querySelector('#cancelSettingsButton'),
  closeSettingsButton: document.querySelector('#closeSettingsButton'),
  playerOneLabel: document.querySelector('#playerOneLabel'),
  playerTwoLabel: document.querySelector('#playerTwoLabel'),
  pointOneButton: document.querySelector('#pointOneButton'),
  pointTwoButton: document.querySelector('#pointTwoButton'),
  aceButton: document.querySelector('#aceButton'),
  aceAction: document.querySelector('#aceAction'),
  doubleFaultButton: document.querySelector('#doubleFaultButton'),
  warningOneButton: document.querySelector('#warningOneButton'),
  warningTwoButton: document.querySelector('#warningTwoButton'),
  warningOneLabel: document.querySelector('#warningOneLabel'),
  warningTwoLabel: document.querySelector('#warningTwoLabel'),
  warningOneCount: document.querySelector('#warningOneCount'),
  warningTwoCount: document.querySelector('#warningTwoCount'),
  oneGameScore: document.querySelector('#oneGameScore'),
  twoGameScore: document.querySelector('#twoGameScore'),
  oneSetOne: document.querySelector('#oneSetOne'),
  oneSetTwo: document.querySelector('#oneSetTwo'),
  oneSetThree: document.querySelector('#oneSetThree'),
  oneSetFour: document.querySelector('#oneSetFour'),
  oneSetFive: document.querySelector('#oneSetFive'),
  twoSetOne: document.querySelector('#twoSetOne'),
  twoSetTwo: document.querySelector('#twoSetTwo'),
  twoSetThree: document.querySelector('#twoSetThree'),
  twoSetFour: document.querySelector('#twoSetFour'),
  twoSetFive: document.querySelector('#twoSetFive'),
  pointContext: document.querySelector('#pointContext'),
  pointCount: document.querySelector('#pointCount'),
  statsTableBody: document.querySelector('#statsTableBody'),
  exportStatsButton: document.querySelector('#exportStatsButton'),
  pointTypeDialog: document.querySelector('#pointTypeDialog'),
  pointTypeTitle: document.querySelector('#pointTypeTitle'),
  pointTypeButtons: document.querySelectorAll('[data-point-type]'),
  cancelPointTypeButton: document.querySelector('#cancelPointTypeButton'),
  historyList: document.querySelector('#historyList'),
  matchNote: document.querySelector('#matchNote'),
  pointAlert: document.querySelector('#pointAlert'),
  sideChangeAlert: document.querySelector('#sideChangeAlert'),
  matchTimer: document.querySelector('#matchTimer'),
  nextSetButton: document.querySelector('#nextSetButton'),
  resumeGameButton: document.querySelector('#resumeGameButton'),
  undoButton: document.querySelector('#undoButton'),
  resetButton: document.querySelector('#resetButton'),
  winnerPanel: document.querySelector('#winnerPanel'),
  winnerName: document.querySelector('#winnerName'),
  winnerSummary: document.querySelector('#winnerSummary')
  ,playerOneRow: document.querySelector('#playerOneRow')
  ,playerTwoRow: document.querySelector('#playerTwoRow')
  ,tossDialog: document.querySelector('#tossDialog')
  ,drawTossButton: document.querySelector('#drawTossButton')
  ,tossResult: document.querySelector('#tossResult')
  ,tossWinnerName: document.querySelector('#tossWinnerName')
  ,chooseServeButton: document.querySelector('#chooseServeButton')
  ,chooseSideButton: document.querySelector('#chooseSideButton')
};

function setsToWin() {
  return state.bestOf === 5 ? 3 : 2;
}

function setsWon(playerIndex) {
  const opponent = 1 - playerIndex;
  return state.sets[playerIndex].reduce((wins, score, setIndex) => wins + (score > state.sets[opponent][setIndex] ? 1 : 0), 0);
}

function isFinalSuperTiebreak() {
  return state.finalSetMode === 'super' && setsWon(0) === setsToWin() - 1 && setsWon(1) === setsToWin() - 1;
}

function isSetTiebreak() {
  return !isFinalSuperTiebreak() && state.games[0] === 6 && state.games[1] === 6;
}

function currentPointScore() {
  if (isFinalSuperTiebreak() || isSetTiebreak()) return [String(state.points[0]), String(state.points[1])];
  if (state.points[0] >= 3 && state.points[1] >= 3) {
    if (state.points[0] === state.points[1]) return 'Deuce';
    return state.points[0] > state.points[1] ? ['Ventaja', '40'] : ['40', 'Ventaja'];
  }
  return [pointLabels[state.points[0]], pointLabels[state.points[1]]];
}

function recordPoint(playerIndex, eventType = 'point') {
  if (state.matchOver || !state.tossComplete || state.setPaused || state.sideChangePaused) return;
  saveSnapshot(playerIndex, eventType);
  state.sideChangeNotice = '';
  applyPoint(playerIndex);
  render();
}

function saveSnapshot(playerIndex = null, eventType = null, warningPlayer = null) {
  state.history.push(JSON.stringify({ games: state.games, sets: state.sets, points: state.points, serverIndex: state.serverIndex, tossWinnerIndex: state.tossWinnerIndex, tossComplete: state.tossComplete, tiebreakPointCount: state.tiebreakPointCount, warnings: state.warnings, setPaused: state.setPaused, sideChangePaused: state.sideChangePaused, sideChangeNotice: state.sideChangeNotice, matchOver: state.matchOver, winnerIndex: state.winnerIndex, winner: playerIndex, eventType, warningPlayer }));
}

function applyPoint(playerIndex) {
  state.points[playerIndex] += 1;
  if (isFinalSuperTiebreak()) {
    updateTiebreakServer();
    if (state.points[playerIndex] >= SUPER_TIEBREAK_TARGET && state.points[playerIndex] - state.points[1 - playerIndex] >= 2) finishSuperTiebreak(playerIndex);
    return;
  }
  if (isSetTiebreak()) {
    updateTiebreakServer();
    if (state.points[playerIndex] >= SET_TIEBREAK_TARGET && state.points[playerIndex] - state.points[1 - playerIndex] >= 2) finishSetTiebreak(playerIndex);
    return;
  }
  if (state.points[playerIndex] >= 4 && state.points[playerIndex] - state.points[1 - playerIndex] >= 2) {
    winGame(playerIndex);
  }
}

function issueWarning(playerIndex) {
  if (state.matchOver || !state.tossComplete || state.setPaused || state.sideChangePaused || state.warnings[playerIndex] >= 3) return;
  const nextWarning = state.warnings[playerIndex] + 1;
  saveSnapshot(nextWarning === 2 ? 1 - playerIndex : null, 'warning', playerIndex);
  state.sideChangeNotice = '';
  state.warnings[playerIndex] += 1;
  const warningCount = state.warnings[playerIndex];
  if (warningCount === 2) applyPoint(1 - playerIndex);
  if (warningCount === 3) finishMatch(1 - playerIndex, `${state.players[1 - playerIndex]} gano el partido por acumulacion de warnings.`);
  render();
}

function winGame(playerIndex) {
  state.games[playerIndex] += 1;
  if ((state.games[0] + state.games[1]) % 2 === 1) state.sideChangeNotice = 'Cambio de lado: se completaron un numero impar de juegos.';
  state.points = [0, 0];
  state.serverIndex = 1 - state.serverIndex;
  const opponent = 1 - playerIndex;
  const gamesWon = state.games[playerIndex];
  const canWinSet = gamesWon >= 6 && gamesWon - state.games[opponent] >= 2;
  if (canWinSet) winSet(playerIndex);
  else if ((state.games[0] + state.games[1]) % 2 === 1) pauseForSideChange();
}

function winSet(playerIndex) {
  state.sets[playerIndex].push(state.games[playerIndex]);
  state.sets[1 - playerIndex].push(state.games[1 - playerIndex]);
  if (setsWon(playerIndex) >= setsToWin()) {
    finishMatch(playerIndex, `${state.players[playerIndex]} gano el partido.`);
  }
  state.games = [0, 0];
  if (!state.matchOver) pauseAfterSet();
}

function finishSetTiebreak(playerIndex) {
  const opponent = 1 - playerIndex;
  state.sets[playerIndex].push(7);
  state.sets[opponent].push(6);
  if (setsWon(playerIndex) >= setsToWin()) {
    finishMatch(playerIndex, `${state.players[playerIndex]} gano el partido.`);
  }
  state.games = [0, 0];
  state.points = [0, 0];
  state.tiebreakPointCount = 0;
  state.warnings = [0, 0];
  if (!state.matchOver) pauseAfterSet();
}

function finishSuperTiebreak(playerIndex) {
  const opponent = 1 - playerIndex;
  state.sets[playerIndex].push(state.points[playerIndex]);
  state.sets[opponent].push(state.points[opponent]);
  finishMatch(playerIndex, `${state.players[playerIndex]} gano el partido en supertiebreak.`);
  state.points = [0, 0];
  state.tiebreakPointCount = 0;
}

function updateTiebreakServer() {
  state.tiebreakPointCount += 1;
  if (state.tiebreakPointCount % 6 === 0) {
    state.sideChangeNotice = 'Cambio de lado: se completaron 6 puntos de tiebreak.';
    pauseForSideChange();
  }
  if (state.tiebreakPointCount === 1 || state.tiebreakPointCount % 2 === 1) state.serverIndex = 1 - state.serverIndex;
}

function finishMatch(playerIndex, message) {
  commitMatchDuration();
  stopMatchTimer();
  state.matchOver = true;
  state.sideChangePaused = false;
  state.winnerIndex = playerIndex;
  elements.matchNote.textContent = message;
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  const restored = JSON.parse(previous);
  Object.assign(state, restored);
  state.warnings = restored.warnings || [0, 0];
  state.sideChangePaused = restored.sideChangePaused || false;
  if (state.setPaused || state.matchOver) stopMatchTimer();
  else if (state.tossComplete) startMatchTimer();
  render();
}

function reset(openToss = true) {
  stopMatchTimer();
  state.games = [0, 0];
  state.sets = [[], []];
  state.points = [0, 0];
  state.serverIndex = null;
  state.tossWinnerIndex = null;
  state.tossComplete = false;
  state.tiebreakPointCount = 0;
  state.history = [];
  state.matchOver = false;
  state.winnerIndex = null;
  state.matchStartTime = null;
  state.matchDuration = 0;
  state.setPaused = false;
  state.sideChangeNotice = '';
  state.sideChangePaused = false;
  render();
  if (openToss) prepareTossDialog();
}

function prepareTossDialog() {
  elements.tossResult.hidden = true;
  elements.drawTossButton.disabled = false;
  if (!elements.tossDialog.open) elements.tossDialog.showModal();
}

function prepareSettingsDialog() {
  elements.appTitleInput.value = state.appTitle;
  elements.categoryInput.value = state.category;
  elements.playerOneInput.value = state.players[0];
  elements.playerTwoInput.value = state.players[1];
  elements.settingsForm.elements.matchFormat.value = String(state.bestOf);
  elements.settingsForm.elements.finalSetMode.value = state.finalSetMode;
  if (!elements.settingsDialog.open) elements.settingsDialog.showModal();
}

function setScoreText(playerIndex, setIndex) {
  if (isFinalSuperTiebreak() && setIndex === state.sets[playerIndex].length) return state.points[playerIndex];
  return state.sets[playerIndex][setIndex] ?? (setIndex === state.sets[playerIndex].length ? state.games[playerIndex] : '-');
}

function matchStats() {
  const stats = state.players.map(() => ({ pointsWon: 0, winners: 0, forcedErrors: 0, unforcedErrors: 0, aces: 0, doubleFaults: 0 }));
  state.history.forEach((snapshot) => {
    const point = JSON.parse(snapshot);
    if (typeof point.winner !== 'number') return;
    stats[point.winner].pointsWon += 1;
    if (point.eventType === 'winner') stats[point.winner].winners += 1;
    if (point.eventType === 'forced-error') stats[1 - point.winner].forcedErrors += 1;
    if (point.eventType === 'unforced-error') stats[1 - point.winner].unforcedErrors += 1;
    if (point.eventType === 'ace') stats[point.winner].aces += 1;
    if (point.eventType === 'double-fault' && point.serverIndex !== null) stats[point.serverIndex].doubleFaults += 1;
  });
  return stats.map((playerStats, playerIndex) => ({
    ...playerStats,
    player: state.players[playerIndex],
    games: state.games[playerIndex],
    sets: setsWon(playerIndex),
    warnings: state.warnings[playerIndex]
  }));
}

function render() {
  const score = currentPointScore();
  elements.appTitle.textContent = state.appTitle;
  elements.matchCategory.textContent = state.category;
  elements.matchTimer.textContent = formatDuration(state.matchDuration);
  renderPointAlert();
  elements.sideChangeAlert.textContent = state.sideChangeNotice;
  elements.sideChangeAlert.hidden = !state.sideChangeNotice;
  document.title = state.appTitle;
  elements.playerOneLabel.textContent = state.players[0];
  elements.playerTwoLabel.textContent = state.players[1];
  elements.pointOneButton.querySelector('.point-label').textContent = state.players[0];
  elements.pointTwoButton.querySelector('.point-label').textContent = state.players[1];
  elements.warningOneLabel.textContent = state.players[0];
  elements.warningTwoLabel.textContent = state.players[1];
  elements.warningOneCount.textContent = `${state.warnings[0]}/3`;
  elements.warningTwoCount.textContent = `${state.warnings[1]}/3`;
  elements.oneGameScore.textContent = Array.isArray(score) ? score[0] : score;
  elements.twoGameScore.textContent = Array.isArray(score) ? score[1] : score;
  elements.oneSetOne.textContent = setScoreText(0, 0);
  elements.oneSetTwo.textContent = setScoreText(0, 1);
  elements.oneSetThree.textContent = setScoreText(0, 2);
  elements.oneSetFour.textContent = setScoreText(0, 3);
  elements.oneSetFive.textContent = setScoreText(0, 4);
  elements.twoSetOne.textContent = setScoreText(1, 0);
  elements.twoSetTwo.textContent = setScoreText(1, 1);
  elements.twoSetThree.textContent = setScoreText(1, 2);
  elements.twoSetFour.textContent = setScoreText(1, 3);
  elements.twoSetFive.textContent = setScoreText(1, 4);
  elements.scoreGrid.style.setProperty('--set-count', state.bestOf);
  document.querySelectorAll('.optional-set').forEach((element) => element.hidden = state.bestOf === 3);
  elements.pointContext.textContent = isFinalSuperTiebreak() ? 'Supertiebreak' : isSetTiebreak() ? 'Tiebreak' : `Juego ${state.games[0] + state.games[1] + 1}`;
  elements.pointCount.textContent = `${state.history.length} ${state.history.length === 1 ? 'punto' : 'puntos'}`;
  elements.undoButton.disabled = state.history.length === 0;
  const pointEntryDisabled = state.matchOver || !state.tossComplete || state.setPaused || state.sideChangePaused;
  elements.pointOneButton.disabled = pointEntryDisabled;
  elements.pointTwoButton.disabled = pointEntryDisabled;
  const servingPlayer = state.serverIndex === null ? null : state.players[state.serverIndex];
  elements.aceAction.textContent = servingPlayer ? `Ace de ${servingPlayer} +` : 'Disponible al iniciar';
  elements.aceButton.disabled = pointEntryDisabled;
  elements.doubleFaultButton.disabled = pointEntryDisabled;
  elements.warningOneButton.disabled = pointEntryDisabled || state.warnings[0] >= 3;
  elements.warningTwoButton.disabled = pointEntryDisabled || state.warnings[1] >= 3;
  elements.nextSetButton.hidden = !state.setPaused || state.matchOver;
  elements.nextSetButton.textContent = `Iniciar ${state.sets[0].length + state.sets[1].length + 1 === 2 ? 'segundo' : 'siguiente'} set`;
  elements.resumeGameButton.hidden = !state.sideChangePaused || state.setPaused || state.matchOver;
  elements.playerOneRow.classList.toggle('serving-player', state.serverIndex === 0);
  elements.playerTwoRow.classList.toggle('serving-player', state.serverIndex === 1);
  elements.winnerPanel.hidden = !state.matchOver;
  if (state.matchOver) {
    elements.winnerName.textContent = state.players[state.winnerIndex];
    elements.winnerSummary.textContent = `Victoria para ${state.players[state.winnerIndex]}.`;
  }
  if (!state.matchOver) elements.matchNote.textContent = state.setPaused ? 'Set terminado. Pulsa iniciar para comenzar el siguiente set.' : isFinalSuperTiebreak() ? 'Set decisivo: primero en llegar a 10 puntos con 2 de ventaja gana.' : isSetTiebreak() ? 'Tiebreak: primero en llegar a 7 puntos con 2 de ventaja gana el set.' : 'Primer jugador en ganar 6 juegos con 2 de ventaja gana el set.';
  renderStats();
  renderHistory();
}

function canWinCurrentGameOnNextPoint(playerIndex) {
  return state.points[playerIndex] >= 3 && state.points[playerIndex] > state.points[1 - playerIndex];
}

function canWinSetOnNextPoint(playerIndex) {
  const opponent = 1 - playerIndex;
  if (isFinalSuperTiebreak() || isSetTiebreak()) {
    const target = isFinalSuperTiebreak() ? SUPER_TIEBREAK_TARGET : SET_TIEBREAK_TARGET;
    return state.points[playerIndex] >= target - 1 && state.points[playerIndex] > state.points[opponent];
  }
  return state.games[playerIndex] >= 5 && state.games[playerIndex] - state.games[opponent] >= 1 && canWinCurrentGameOnNextPoint(playerIndex);
}

function renderPointAlert() {
  if (state.matchOver || state.setPaused || state.sideChangePaused) {
    elements.pointAlert.hidden = true;
    return;
  }
  const matchPointPlayers = [];
  const setPointPlayers = [];
  for (let playerIndex = 0; playerIndex < 2; playerIndex += 1) {
    if (!canWinSetOnNextPoint(playerIndex)) continue;
    if (setsWon(playerIndex) === setsToWin() - 1 || isFinalSuperTiebreak()) matchPointPlayers.push(state.players[playerIndex]);
    else setPointPlayers.push(state.players[playerIndex]);
  }
  const message = matchPointPlayers.length ? `Match point para ${matchPointPlayers.join(' y ')}` : setPointPlayers.length ? `Set point para ${setPointPlayers.join(' y ')}` : '';
  elements.pointAlert.textContent = message;
  elements.pointAlert.hidden = !message;
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function updateMatchDuration() {
  if (state.matchStartTime === null || state.matchOver) return;
  const activeDuration = Math.floor((Date.now() - state.matchStartTime) / 1000);
  elements.matchTimer.textContent = formatDuration(state.matchDuration + activeDuration);
}

function startMatchTimer() {
  if (state.matchStartTime === null) state.matchStartTime = Date.now();
  stopMatchTimer();
  timerInterval = setInterval(updateMatchDuration, 1000);
  render();
}

function stopMatchTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function pauseAfterSet() {
  commitMatchDuration();
  stopMatchTimer();
  state.setPaused = true;
  state.sideChangePaused = false;
}

function pauseForSideChange() {
  if (state.setPaused || state.matchOver) return;
  commitMatchDuration();
  stopMatchTimer();
  state.sideChangePaused = true;
}

function commitMatchDuration() {
  if (state.matchStartTime !== null) {
    state.matchDuration += Math.floor((Date.now() - state.matchStartTime) / 1000);
    state.matchStartTime = null;
  }
  elements.matchTimer.textContent = formatDuration(state.matchDuration);
}

function startNextSet() {
  if (!state.setPaused || state.matchOver) return;
  state.setPaused = false;
  state.sideChangeNotice = '';
  state.sideChangePaused = false;
  startMatchTimer();
}

function resumeAfterSideChange() {
  if (!state.sideChangePaused || state.setPaused || state.matchOver) return;
  state.sideChangePaused = false;
  state.sideChangeNotice = '';
  startMatchTimer();
}

function renderStats() {
  elements.statsTableBody.innerHTML = matchStats().map((stats) => `<tr><th scope="row">${stats.player}</th><td>${stats.pointsWon}</td><td>${stats.winners}</td><td>${stats.forcedErrors}</td><td>${stats.unforcedErrors}</td><td>${stats.aces}</td><td>${stats.doubleFaults}</td><td>${stats.games}</td><td>${stats.sets}</td><td><span class="warning-count">${stats.warnings}/3</span></td></tr>`).join('');
}

function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<li class="empty-history">Los puntos registrados apareceran aqui.</li>';
    return;
  }
  const recent = state.history.slice(-8).reverse();
  elements.historyList.innerHTML = recent.map((snapshot, index) => {
    const before = JSON.parse(snapshot);
    const winner = index === 0 ? 'Ultimo punto' : `Punto ${state.history.length - index}`;
    const player = before.eventType === 'warning' ? state.players[before.warningPlayer] : state.players[before.winner];
    const eventLabels = { ace: 'Ace', 'double-fault': 'Doble falta', winner: 'Winner', 'forced-error': 'Error forzado', 'unforced-error': 'Error no forzado', warning: 'Warning' };
    const event = before.eventType ? ` (${eventLabels[before.eventType] || before.eventType})` : '';
    return `<li><span>${winner}${event}</span><span class="history-winner">${player}</span></li>`;
  }).join('');
}

function preparePointTypeDialog(playerIndex) {
  if (state.matchOver || !state.tossComplete || state.setPaused || state.sideChangePaused) return;
  pendingPointPlayer = playerIndex;
  elements.pointTypeTitle.textContent = `Punto ganado por ${state.players[playerIndex]}`;
  if (!elements.pointTypeDialog.open) elements.pointTypeDialog.showModal();
}

elements.pointOneButton.addEventListener('click', () => preparePointTypeDialog(0));
elements.pointTwoButton.addEventListener('click', () => preparePointTypeDialog(1));
elements.pointTypeButtons.forEach((button) => button.addEventListener('click', () => {
  if (pendingPointPlayer === null) return;
  recordPoint(pendingPointPlayer, button.dataset.pointType);
  pendingPointPlayer = null;
  elements.pointTypeDialog.close();
}));
elements.cancelPointTypeButton.addEventListener('click', () => {
  pendingPointPlayer = null;
  elements.pointTypeDialog.close();
});
elements.aceButton.addEventListener('click', () => {
  if (state.serverIndex !== null) recordPoint(state.serverIndex, 'ace');
});
elements.doubleFaultButton.addEventListener('click', () => {
  if (state.serverIndex !== null) recordPoint(1 - state.serverIndex, 'double-fault');
});
elements.warningOneButton.addEventListener('click', () => issueWarning(0));
elements.warningTwoButton.addEventListener('click', () => issueWarning(1));
elements.nextSetButton.addEventListener('click', startNextSet);
elements.resumeGameButton.addEventListener('click', resumeAfterSideChange);
elements.exportStatsButton.addEventListener('click', () => {
  const headers = ['Jugador', 'Puntos ganados', 'Winner', 'Errores forzados', 'Errores no forzados', 'Aces', 'Dobles faltas', 'Juegos', 'Sets', 'Warnings'];
  const rows = matchStats().map((stats) => [stats.player, stats.pointsWon, stats.winners, stats.forcedErrors, stats.unforcedErrors, stats.aces, stats.doubleFaults, stats.games, stats.sets, stats.warnings]);
  const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\r\n');
  const fileName = `${state.appTitle.replace(/[^a-z0-9áéíóúñü -]/gi, '').trim() || 'partido'}-estadisticas.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }));
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
});
elements.undoButton.addEventListener('click', undo);
elements.resetButton.addEventListener('click', () => {
  reset(false);
  prepareSettingsDialog();
});
elements.settingsButton.addEventListener('click', prepareSettingsDialog);
elements.cancelSettingsButton.addEventListener('click', () => elements.settingsDialog.close());
elements.closeSettingsButton.addEventListener('click', () => elements.settingsDialog.close());
elements.drawTossButton.addEventListener('click', () => {
  state.tossWinnerIndex = Math.random() < 0.5 ? 0 : 1;
  elements.tossWinnerName.textContent = state.players[state.tossWinnerIndex];
  elements.tossResult.hidden = false;
  elements.drawTossButton.disabled = true;
});
function completeToss(choice) {
  state.serverIndex = choice === 'serve' ? state.tossWinnerIndex : 1 - state.tossWinnerIndex;
  state.tossComplete = true;
  startMatchTimer();
  elements.tossDialog.close();
  render();
}
elements.chooseServeButton.addEventListener('click', () => completeToss('serve'));
elements.chooseSideButton.addEventListener('click', () => completeToss('side'));
elements.settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.appTitle = elements.appTitleInput.value.trim() || 'Marcador de tenis';
  state.category = elements.categoryInput.value.trim() || 'Partido de tenis';
  state.players = [elements.playerOneInput.value.trim() || 'Jugador 1', elements.playerTwoInput.value.trim() || 'Jugador 2'];
  state.bestOf = Number(new FormData(elements.settingsForm).get('matchFormat'));
  state.finalSetMode = new FormData(elements.settingsForm).get('finalSetMode');
  reset(false);
  elements.settingsDialog.close();
  prepareTossDialog();
});
document.addEventListener('keydown', (event) => {
  if (event.target.tagName === 'INPUT') return;
  if (elements.pointTypeDialog.open) {
    const pointTypeKeys = { '1': 'winner', '2': 'forced-error', '3': 'unforced-error' };
    const pointType = pointTypeKeys[event.key];
    if (pointType) {
      event.preventDefault();
      elements.pointTypeDialog.querySelector(`[data-point-type="${pointType}"]`).click();
    }
    return;
  }
  if (event.key === '1') preparePointTypeDialog(0);
  if (event.key === '2') preparePointTypeDialog(1);
  if (event.key.toLowerCase() === 'z') undo();
});
render();
prepareSettingsDialog();
