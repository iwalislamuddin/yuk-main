// Antarmuka seragam satu game untuk GamePage.
// Setiap game mengekspor: createGame(parent, deps), LocalBotController, OnlineController.
import { createLudoGame } from "./createGame.js";
import { LocalBotController } from "./LocalBotController.js";
import { OnlineController } from "./OnlineController.js";

export default {
  createGame: createLudoGame,
  LocalBotController,
  OnlineController
};
