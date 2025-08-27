// Entity classes
const Player = require('./entities/Player');
const Realm = require('./entities/Realm');
const Army = require('./entities/Army');
const Unit = require('./entities/Unit');
const GameTurn = require('./entities/GameTurn');
const Command = require('./entities/Command');

// System classes
const TurnManager = require('./systems/TurnManager');
const CombatEngine = require('./systems/CombatEngine');

// World classes
const Map = require('./world/Map');

module.exports = {
    // Entities
    Player,
    Realm,
    Army,
    Unit,
    GameTurn,
    Command,
    
    // Systems
    TurnManager,
    CombatEngine,
    
    // World
    Map
};
