let currentZoom = 1;
let mapData = null;
let selectedTile = null;
let moveMode = false;
let selectedArmy = null;
let movePath = [];
let maxMoves = 1;

// Notification system
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const messageEl = document.getElementById('notificationMessage');
    
    // Set message and styling based on type
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type}`;
    
    // Show notification
    container.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        container.style.display = 'none';
    }, 3000);
}

// Initialize map
document.addEventListener('DOMContentLoaded', function() {
    loadMapData();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('zoomIn').addEventListener('click', () => {
        currentZoom = Math.min(currentZoom * 1.2, 3);
        updateMapDisplay();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        currentZoom = Math.max(currentZoom / 1.2, 0.5);
        updateMapDisplay();
    });

    document.getElementById('centerMap').addEventListener('click', () => {
        centerOnPlayerArmies();
    });
}

async function loadMapData() {
    try {
        const response = await fetch('/api/map/data');
        if (response.ok) {
            mapData = await response.json();
            renderMap();
            // Removed automatic centering to prevent page jumping
        } else {
            showNotification('Failed to load map data', 'danger');
        }
    } catch (error) {
        showNotification('Error loading map data', 'danger');
    }
}

function renderMap() {
    if (!mapData) return;

    const mapGrid = document.getElementById('mapGrid');
    const bounds = mapData.mapBounds;
    
    // Calculate grid dimensions
    const width = bounds.max_x - bounds.min_x + 1;
    const height = bounds.max_y - bounds.min_y + 1;
    
    mapGrid.innerHTML = '';

    // Create table-based grid structure
    let tileCount = 0;
    for (let y = bounds.min_y; y <= bounds.max_y; y++) {
        const row = document.createElement('div');
        row.className = 'map-row';
        
        for (let x = bounds.min_x; x <= bounds.max_x; x++) {
            const tile = createMapTile(x, y);
            row.appendChild(tile);
            tileCount++;
        }
        
        mapGrid.appendChild(row);
    }
}

function createMapTile(x, y) {
    const tile = document.createElement('div');
    tile.className = 'map-tile';
    tile.dataset.x = x;
    tile.dataset.y = y;
    
    // Find tile data
    const tileData = mapData.visibleTiles.find(t => t.x_coord === x && t.y_coord === y);
    
    if (tileData) {
        tile.classList.add(`terrain-${tileData.terrain_type}`);
        tile.title = `${tileData.description} (${x}, ${y})`;
        
        // Add terrain icon
        const terrainIcon = document.createElement('div');
        terrainIcon.className = 'terrain-icon';
        terrainIcon.textContent = getTerrainIcon(tileData.terrain_type);
        tile.appendChild(terrainIcon);
        
        // Check for armies - show ALL armies at this location
        const playerArmies = mapData.playerArmies.filter(a => a.x_coord === x && a.y_coord === y);
        const enemyArmies = mapData.enemyArmies.filter(a => a.x_coord === x && a.y_coord === y);
        
        // Show player armies first
        playerArmies.forEach((army, index) => {
            const armyIndicator = document.createElement('div');
            armyIndicator.className = 'army-indicator player-army';
            armyIndicator.textContent = '⚔️';
            armyIndicator.title = `Your Army: ${army.name}`;
            // Stack multiple armies with slight offset
            if (index > 0) {
                armyIndicator.style.position = 'relative';
                armyIndicator.style.left = `${index * 8}px`;
                armyIndicator.style.top = `${index * 8}px`;
            }
            tile.appendChild(armyIndicator);
        });
        
        // Show enemy armies (always visible, regardless of player armies)
        enemyArmies.forEach((army, index) => {
            const armyIndicator = document.createElement('div');
            armyIndicator.className = 'army-indicator enemy-army';
            armyIndicator.textContent = '⚔️';
            armyIndicator.title = `Enemy Army: ${army.name} (${army.realm_name})`;
            // Stack multiple armies with slight offset
            // For enemy armies, start offset after player armies
            const totalOffset = playerArmies.length + index;
            if (totalOffset > 0) {
                armyIndicator.style.position = 'relative';
                armyIndicator.style.left = `${totalOffset * 8}px`;
                armyIndicator.style.top = `${totalOffset * 8}px`;
            }
            tile.appendChild(armyIndicator);
        });
    } else {
        tile.classList.add('terrain-unknown');
        tile.title = `Unknown Territory (${x}, ${y})`;
        
        // Add unknown terrain icon
        const terrainIcon = document.createElement('div');
        terrainIcon.className = 'terrain-icon';
        terrainIcon.textContent = '❓';
        terrainIcon.style.color = '#fff';
        tile.appendChild(terrainIcon);
    }
    
    tile.addEventListener('click', () => selectTile(x, y, tileData));
    
    return tile;
}

function getTerrainIcon(terrainType) {
    const icons = {
        'open': '',
        'forest': '🌲',
        'mountains': '⛰️',
        'water': '',
        'desert': '🏜️',
        'hills': '🏔️'
    };
    return terrainType in icons ? icons[terrainType] : '❓';
}

function selectTile(x, y, tileData) {
    if (moveMode) {
        handleMoveTileSelection(x, y, tileData);
        return;
    }
    
    // Remove previous selection
    if (selectedTile) {
        selectedTile.classList.remove('selected');
    }
    
    // Select new tile
    const tileElement = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (tileElement) {
        tileElement.classList.add('selected');
        selectedTile = tileElement;
    }
    
    // Show tile info
    showTileInfo(x, y, tileData);
}

function showTileInfo(x, y, tileData) {
    const tileInfo = document.getElementById('tileInfo');
    const tileDetails = document.getElementById('tileDetails');
    
    if (tileData) {
        tileDetails.innerHTML = `
            <div class="tile-detail">
                <span>(${x}, ${y}) ${tileData.terrain_type} Mov: ${tileData.movement_cost} Def: ${tileData.defence_bonus}</span>
            </div>
        `;
        
        // Check for armies - show ALL armies at this location
        const playerArmies = mapData.playerArmies.filter(a => a.x_coord === x && a.y_coord === y);
        const enemyArmies = mapData.enemyArmies.filter(a => a.x_coord === x && a.y_coord === y);
        
        // Show player armies first
        if (playerArmies.length > 0) {
            tileDetails.innerHTML += `
                <div class="tile-detail">
                    <strong>Your Armies (${playerArmies.length}):</strong>
                </div>
            `;
            
            playerArmies.forEach((army, index) => {
                tileDetails.innerHTML += `
                    <div class="tile-detail tile-detail-player">
                        <strong>${army.name}</strong>
                        <br>
                        <strong>Strategic Speed:</strong> <span>${army.strategic_speed || 1}</span>
                        <br>
                        <div class="tile-detail-spacing">
                `;
                
                // Check command status for this specific army and add appropriate button/badge
                checkArmyCommandStatus(army.id).then(hasCommand => {
                    if (!hasCommand) {
                        tileDetails.innerHTML += `
                            <button class="btn btn-sm btn-primary" onclick="startMove(${army.id}, ${x}, ${y}, ${army.strategic_speed || 1})">
                                Move ${army.name}
                            </button>
                        `;
                    } else {
                        tileDetails.innerHTML += `
                            <span class="badge bg-warning">Has Command</span>
                        `;
                    }
                    
                    // Close the army detail div
                    tileDetails.innerHTML += `
                        </div>
                    </div>
                    `;
                });
            });
        }
        
        // Show enemy armies
        if (enemyArmies.length > 0) {
            tileDetails.innerHTML += `
                <div class="tile-detail">
                    <strong>Enemy Armies (${enemyArmies.length}):</strong>
                </div>
            `;
            
            enemyArmies.forEach((army, index) => {
                tileDetails.innerHTML += `
                    <div class="tile-detail tile-detail-enemy">
                        <strong>${army.name}</strong>
                        <br>
                        <strong>Realm:</strong> <span>${army.realm_name}</span>
                        <br>
                        <strong>Player:</strong> <span>${army.player_nick}</span>
                    </div>
                `;
            });
        }
        
        tileInfo.style.display = 'block';
    } else {
        tileDetails.innerHTML = `
            <div class="tile-detail">
                <span>(${x}, ${y}) Unknown Territory</span>
            </div>
        `;
        tileInfo.style.display = 'block';
    }
}

async function checkArmyCommandStatus(armyId) {
    try {
        const response = await fetch(`/api/commands/army/${armyId}`);
        const data = await response.json();
        return data.hasCommand;
    } catch (error) {
        return false;
    }
}

function startMove(armyId, startX, startY, speed) {
    selectedArmy = { id: armyId, x: startX, y: startY };
    maxMoves = speed;
    movePath = [{ x: startX, y: startY }];
    moveMode = true;
    
    // Add visual indicator that move mode is active with integrated controls
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        const moveIndicator = document.createElement('div');
        moveIndicator.id = 'moveModeIndicator';
        moveIndicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #e74c3c; color: white; padding: 15px; border-radius: 8px; z-index: 1000; font-weight: bold; min-width: 320px; max-width: 400px;';
        
        moveIndicator.innerHTML = `
            <div class="move-mode-header">MOVE MODE ACTIVE</div>
            <div class="move-mode-instructions">
                <strong>Army Speed:</strong> ${speed} | <strong>Start:</strong> (${startX}, ${startY})
            </div>
            <div id="pathDisplay" class="path-display">
                <div class="path-header"><strong>Path:</strong></div>
                <div id="pathSteps"></div>
            </div>
            <div class="path-buttons">
                <button onclick="commitMove()" id="commitMoveBtn" disabled class="commit-move-btn">Commit Move</button>
                <button onclick="cancelMove()" class="cancel-move-btn">Cancel</button>
            </div>
            <div class="move-mode-footer">
                Click adjacent tiles to build path. First move: 8 directions, then 4 directions only.
            </div>
        `;
        
        mapContainer.appendChild(moveIndicator);
        
        // Initialize path display
        updatePathDisplay();
    }
    
    // Highlight start tile
    highlightMovePath();
}

function handleMoveTileSelection(x, y, tileData) {
    if (!selectedArmy || !tileData) return;
    
    const lastPosition = movePath[movePath.length - 1];
    const dx = x - lastPosition.x;
    const dy = y - lastPosition.y;
    const isDiagonal = Math.abs(dx) === 1 && Math.abs(dy) === 1;
    const isCardinal = (Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1);
    
    // Check if this is a valid move based on current path length
    if (movePath.length === 1) {
        // First move: any adjacent tile is fine (including diagonal)
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
            if (tileData.terrain_type === 'open') {
                movePath.push({ x, y });
            } else {
                // Non-open terrain ends movement
                movePath.push({ x, y });
                finalizeMovePath();
                return;
            }
        } else {
            showNotification('Can only move to adjacent tiles', 'warning');
            return;
        }
    } else if (movePath.length <= maxMoves) {
        // Additional moves: only cardinal directions
        if (isCardinal) {
            if (tileData.terrain_type === 'open') {
                movePath.push({ x, y });
            } else {
                // Non-open terrain ends movement
                movePath.push({ x, y });
                finalizeMovePath();
                return;
            }
        } else {
            showNotification('Additional moves must be in cardinal directions (up, down, left, right)', 'warning');
            return;
        }
    } else {
        showNotification('Maximum moves reached for this army', 'warning');
        return;
    }
    
    // Check if we've reached max moves or hit non-open terrain
    if (movePath.length >= maxMoves || tileData.terrain_type !== 'open') {
        finalizeMovePath();
    }
    
    updatePathDisplay();
    highlightMovePath();
}

function finalizeMovePath() {
    document.getElementById('commitMoveBtn').disabled = false;
}

function updatePathDisplay() {
    const pathSteps = document.getElementById('pathSteps');
    if (!pathSteps) return;
    
    let html = `
        <div class="unit-info">
            Start
        </div>
        <span>(${movePath[0].x}, ${movePath[0].y})</span>
    `;
    
    for (let i = 1; i < movePath.length; i++) {
        const step = movePath[i];
        const stepNumber = i;
        html += `
            <div class="unit-info-spacing">
                <div class="unit-info-enemy">
                    Step ${stepNumber}
                </div>
                <span>(${step.x}, ${step.y})</span>
            </div>
        `;
    }
    
    pathSteps.innerHTML = html;
}

function highlightMovePath() {
    // Remove previous highlights
    document.querySelectorAll('.map-tile').forEach(tile => {
        tile.classList.remove('move-start', 'move-path', 'move-end');
    });
    
    // Highlight current path
    movePath.forEach((step, index) => {
        const tile = document.querySelector(`[data-x="${step.x}"][data-y="${step.y}"]`);
        if (tile) {
            if (index === 0) {
                tile.classList.add('move-start');
            } else if (index === movePath.length - 1) {
                tile.classList.add('move-end');
            } else {
                tile.classList.add('move-path');
            }
        }
    });
}

function endMoveMode() {
    moveMode = false;
    selectedArmy = null;
    movePath = [];
    
    // Remove move mode indicator
    const moveIndicator = document.getElementById('moveModeIndicator');
    if (moveIndicator) {
        moveIndicator.remove();
    }
    
    // Remove highlights
    document.querySelectorAll('.map-tile').forEach(tile => {
        tile.classList.remove('move-start', 'move-path', 'move-end');
    });
    
    // Show confirmation message
    showMoveModeEndedMessage();
}

function showMoveModeEndedMessage() {
    // Create a temporary success message
    const message = document.createElement('div');
    message.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #27ae60; color: white; padding: 15px 25px; border-radius: 8px; z-index: 1001; font-weight: bold; font-size: 16px;';
    message.textContent = 'Move Mode Ended';
    
    document.body.appendChild(message);
    
    // Remove the message after 2 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 2000);
}

function cancelMove() {
    // Store the current tile position before ending move mode
    const currentTileX = selectedArmy.x;
    const currentTileY = selectedArmy.y;
    
    endMoveMode();
    
    // Refresh tile info to show current state
    const tileData = mapData.visibleTiles.find(tile => tile.x_coord === currentTileX && tile.y_coord === currentTileY);
    if (tileData) {
        selectTile(currentTileX, currentTileY, tileData);
    }
}

async function commitMove() {
    if (!selectedArmy || movePath.length < 2) {
        showNotification('Invalid move path', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/commands/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                armyId: selectedArmy.id,
                path: movePath
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Move command created successfully!', 'success');
            
            // Store the current tile position before ending move mode
            const currentTileX = selectedArmy.x;
            const currentTileY = selectedArmy.y;
            
            endMoveMode();
            
            // Refresh map data to show updated command status
            await loadMapData();
            
            // After map refresh, restore the tile selection to show updated info
            const tileData = mapData.visibleTiles.find(tile => tile.x_coord === currentTileX && tile.y_coord === currentTileY);
            if (tileData) {
                selectTile(currentTileX, currentTileY, tileData);
            }
        } else {
            showNotification('Error creating move command: ' + data.error, 'danger');
        }
    } catch (error) {
        showNotification('Error creating move command', 'danger');
    }
}

function updateMapDisplay() {
    const mapGrid = document.getElementById('mapGrid');
    mapGrid.style.transform = `scale(${currentZoom})`;
}

function centerOnPlayerArmies() {
    if (!mapData || mapData.playerArmies.length === 0) return;
    
    // Calculate center of player armies
    const avgX = mapData.playerArmies.reduce((sum, army) => sum + army.x_coord, 0) / mapData.playerArmies.length;
    const avgY = mapData.playerArmies.reduce((sum, army) => sum + army.y_coord, 0) / mapData.playerArmies.length;
    
    // Find the tile element at the center coordinates
    const centerTile = document.querySelector(`[data-x="${Math.round(avgX)}"][data-y="${Math.round(avgY)}"]`);
    if (centerTile) {
        // Scroll the tile into view
        centerTile.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
}
