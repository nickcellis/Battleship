const gridSize = 10;
let robotGuardSize = 2;

let gridArray = [100];
let hasGridLoaded = false;
let hasClicked = false;
let lastClickedId = -1;

const ButtonType = {
    Continue : "Continue", End : "End", Play_Again : "Play Again"
}
const StageType = {
    Setup : "Setup", Play : "Play", End : "End"
}

let currentStage = StageType.Setup;
let scoreboardManager = null;

let shouldRobotMove = false;
let computerScore = 0;
let userScore = 0;
let round = 0;


// This is the function for the scoreboard
// We can modify this to whatever we like and the scoreboard
// will still work
function scoreboardList() { 
    switch(currentStage) {
        case StageType.Setup: {
            return [
                "Setup instruction:",
                "",
                "'u' - You can only spawn 1 submarine.",
                "'k' - You can spawn many robot killer.",
                "'5-9' - Using the number you can spawn fuel amount on each cell."
            ];
        }
        case StageType.End: {
            return [
                "",
                "",
                "Game has ended.",
                "",
                "",
            ];
        }
    }

    return [
        "Scoreboard:",
        "Round: " + round,
        "User Score: " + userScore,
        "Computer Score: " + computerScore,
        "Submarine Fuel: " + getSubmarineFuel(),
    ];
}

function init() {
    resetGridAndLoad();
    scoreboardManager = new ScoreboardManager();

    // Generate button on the screen
    // This will provide the button for Conitnue, End and Play Aagain
    let buttonWrapper = document.getElementById('score-wrapper');
    if (buttonWrapper == null) {
        buttonWrapper = document.createElement('div');
        buttonWrapper.id = "score-wrapper";
        buttonWrapper.className = "wrapper-info";

        let button = document.createElement('button');
        button.id = "game-btn";
        button.className = "btn";
        button.innerHTML = ButtonType.Continue;
    
        // Button event of 'click'
        button.addEventListener('click', function(){
            let btn = document.getElementById('game-btn');
            if (btn != null) {
                switch (btn.innerHTML) {
                    case ButtonType.Continue: {
                        if (countEntities(EntityType.Submarine) == 0) {
                            new NotifyMessage("You must place a sumarine on a cell before continuing.").notifyError();
                            return;
                        }
                        currentStage = StageType.Play;
                        btn.innerHTML = ButtonType.End;

                        // Check if theres no robot killer or no fuel entity then handle game over
                        if (countEntities(EntityType.Robotic) == 0 || countEntities(EntityType.Fuel) == 0) {
                            // Purpose of this delay, is to make the game smoother and look better
                            setTimeout(function() {
                                handleGameOver();
                            }, 1000);
                        }
                        break;
                    }
    
                    case ButtonType.End: {
                        if (currentStage == StageType.End) return;
                        btn.innerHTML = ButtonType.Play_Again;
                        handleGameOver();
                        break;
                    }

                    case ButtonType.Play_Again: {
                        btn.innerHTML = ButtonType.Continue;
                        resetGridAndLoad();
                        break;
                    }
                }
            }
        });
    
        buttonWrapper.appendChild(button);
        document.body.appendChild(buttonWrapper);
    }
}

// This function will reset everything related to the game so
// that it is ready for the next game
function resetGridAndLoad() {
    //Reset
    currentStage = StageType.Setup;
    computerScore = 0;
    userScore = 0;
    round = 0;

    // Grid generator
    // First generator
    let gridWrapper = document.getElementById('wrapper-grid');
    if (gridWrapper == null) {
        gridWrapper = document.createElement('div');
        gridWrapper.id = "wrapper-grid";
        gridWrapper.className = "wrapper-cell";
        for (let x = 0; x < gridSize; x++) {
            // Create 2d array
            gridArray[x] = [gridSize];
            for (let y = 0; y < gridSize; y++) {
                let cell = new Cell(x, y);
                gridArray[x][y] = cell;
                gridWrapper.appendChild(cell.create(""));
            }
            hasGridLoaded = true;
        }
        document.body.appendChild(gridWrapper);
        return;
    }

    //Reset all grid
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            let cell = new Cell(x, y);
            // Reset all cells entity to normal cell
            if (gridArray[x][y].entityType != EntityType.Cell) {
                gridArray[x][y] = cell;
            }
            cell.create("");
        }
    }

    // Remove all old notifications
    new NotifyMessage("").removeAll();
}

// Event handler; Handle all inputs via keyboard
function onHandleSetupInput(key) {
    // Check if the user has clicked on a cell, otherwise return
    if (lastClickedId == -1) return;
    // Game State must be in the set up stage before continuing
    if (currentStage != StageType.Setup) return;

    // To find the cell we get the id of the element then split
    // the id by '-' so we could get the x and y axis
    let element = document.getElementById(lastClickedId);
    let split = element.id.split("-");
    let cellX = +split[1];
    let cellY = +split[2];
    
    switch(key) {
        case 'o': {
            gridArray[cellX][cellY] = new ObstacleEntity(cellX, cellY);
            break;
        }
        case 'u': {
            if (countEntities(EntityType.Submarine) > 0) {
                new NotifyMessage("Submarine already exist.").notifyError();
                return;
            }
            gridArray[cellX][cellY] = new SubmarineEntity(10, cellX, cellY);
            break;
        }
        case 'k': {
            let robotic = new RoboticEntity(cellX, cellY);
            robotic.onGuard = Math.random() < 0.5 && robotGuardSize-- > 0 ? true : false;
            gridArray[cellX][cellY] = new RoboticEntity(cellX, cellY);
            break;
        }

        // if the input isn't anything above, we check if its numeric, if not
        // we notify the user the input is incorrect
        default: {
            let num = +key;
            if (num >= 5 && num <= 9) {
                gridArray[cellX][cellY] = new FuelEntity(num, cellX, cellY);
            } else {
                new NotifyMessage("Check the setup instruction. Your input '" + key + "' does not match.").notifyError();
            }
            break;
        }
    }
}

// Check for any input via the keyboard
onkeydown = function(event) {
    if (hasClicked) {
        onHandleSetupInput(event.key);
        hasClicked = false;
    }
    if (currentStage != StageType.Play) return;

    let key = event.key;
    // Check key input
    if (key == 's' || key == 'a' || key == 'w' || key == 'd') {
        // Find submarine
        let submarineCell = null;
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
                let cell = gridArray[x][y];
                if (cell.entity == EntityType.Submarine) {
                    submarineCell = cell;
                    break;
                }
            }
        }
        if (submarineCell != null) {
            submarineCell.movePosition(event.key);
        }
    } else {
        new NotifyMessage("Incorrect input! Try again.").notifyError();
    }
}

// Possible winners that you can have
const WinnerType = {
    User : "User", Computer : "Computer", Draw : "Draw"
}

/**
 * Function to handle the game over events
 */
function handleGameOver() {

    // if already end then we the game must of already 
    // handled the game over
    if (currentStage == StageType.End) return;

    currentStage = StageType.End;
    let btn = document.getElementById('game-btn');
    if (btn != null) {
        btn.innerHTML = ButtonType.Play_Again;
    }
    const submarine = getSubmarine();
    
    let winner = null;
    let reason = "";
    if (submarine != null && submarine.isDead || computerScore > userScore) {
        winner = WinnerType.Computer;
        reason = "Submarine was destroyed or computer had a higher score"
    } else {
        if (userScore > computerScore) {
            winner = WinnerType.User;
            reason = "You scored more points than the computer"
        } else {
            winner = WinnerType.Draw;
            reason = "Equal score"
        }
    }

    new NotifyMessage("Winner: " + winner + "!").notify();
    new NotifyMessage(reason).notify();
}


// This is a enum constant that gives options of what kind
// of entities that can be use.
const EntityType = {
    Submarine: 0,
    Robotic: 1, 
    Fuel: 2,
    Cell: 3,
    Obstacle: 4
}

/**
 * Entity class to be use as a base for other entities, such as
 * Submarine, robot etc
 * @class
 */
class Entity {
    constructor(entity, x, y) {
        this.entity = entity;
        this.cellX = x;
        this.cellY = y;
    }
    
    /**
     * Function to help set display name on cell
     * @param {String} replacement - Name to display on cell 
     */
    setDisplayName(replacement) {
        let cell = new Cell(this.cellX, this.cellY);
        cell.create(replacement);
        gridArray[this.cellX][this.cellY] = cell;
    }

    /**
     * This function just an extension of setDisplayName, even though they do the same thing
     * but they're being use in different parts of the code.
     * Having a different function name makes more sense.
     * @param {String} replacement - Update name while also replacing the cell
     */
    replaceCell(replacement) {
        this.setDisplayName(replacement);
    }
 }

 /**
  * Submarine class that extends the entity class,
  * all functions from the super class can be use if it's public
  * @class
  */
class SubmarineEntity extends Entity {
    constructor(fuel, x, y) {
        super(EntityType.Submarine, x, y);
        this.currentFuel = parseInt(fuel);// 10 units
        this.setDisplayName("\u{1F680}");
        this.isDead = false;
    }

    /**
     * Submarine movement
     * @param {String} key - Keyboard input
     */
    movePosition(key) {
        if (currentStage == StageType.Setup || currentStage == StageType.End) return;
        if (this.currentFuel <= 0) {
            new NotifyMessage("No fuel to move").notifyError();
            return;
        };

        let x = parseInt(this.cellX);
        let y = parseInt(this.cellY);
        switch(key) {
            case "a": {
                if (y - 1 < 0) {
                    new NotifyMessage("You cannot go there! Try again.").notifyError();
                    return;
                }
                y = Math.min(Math.max(y - 1, 0), 9);
                break;
            }
            case "d": {
                if (y + 1 > 9) {
                    new NotifyMessage("You cannot go there! Try again.").notifyError();
                    return;
                }
                y = Math.min(Math.max(y + 1, 0), 9);
                break;
            }
            case "w": {
                if (x - 1 < 0) {
                    new NotifyMessage("You cannot go there! Try again.").notifyError();
                    return;
                }
                x = Math.min(Math.max(x - 1, 0), 9);
                break;
            }
            case "s": {
                if (x + 1 > 9) {
                    new NotifyMessage("You cannot go there! Try again.").notifyError();
                    return;
                }
                x = Math.min(Math.max(x + 1, 0), 9);
                break;
            }
        }
        
        let nextCell = gridArray[x][y];
        switch(nextCell.entity) {
            case EntityType.Robotic: {
                this.isDead = true;
                handleGameOver();
                return;
            }
            case EntityType.Obstacle: {
                new NotifyMessage("You cannot go there").notifyError();
                return;
            }
            case EntityType.Fuel: {
                let fuelAmount = +nextCell.fuel;
                this.currentFuel += fuelAmount;
                userScore += fuelAmount;
                break;
            }
        }

        // Replace old submarine cell to normal cell
        // Also update the display name
        if (x != this.cellX || y != this.cellY) {
            let replacementCell = new Cell(this.cellX, this.cellY);
            replacementCell.replaceCell(" ");
        }

        if (nextCell.entity == EntityType.Fuel) {
            if (countEntities(EntityType.Fuel) == 1) {
                // This is equal to 1 because the grid cell isn't updated yet so this will be 1 rather than ZERO
                handleGameOver();
                return;
            }
        }

        // Here we deduct the fuel unit by 1
        this.currentFuel--;
        // We also check if the fuel unit is ZERO we then end the game
        if (this.currentFuel == 0) {
            handleGameOver();
            return;
        }
        // Update the submarine to a new cell
        gridArray[x][y] = new SubmarineEntity(this.currentFuel, x, y);

        // Once the player movement is set
        // We then execute the movement of the computer
        let robotic = getRobotic();
        // if movePosition return false we will find a new robot to move
        while(robotic != null && !robotic.movePosition()) {

            if (countEntities(EntityType.Robotic) == 1) {
                // Imagine if there's only 1 roboto and it was stucked and cannot move. Therefore, the winner
                // has been decided as there isnt any robot that can do the tasks needed
                handleGameOver()
                break;
            }

            robotic = getRobotic();
        }
    }
}

class RoboticEntity extends Entity {

    constructor(x, y) {
        super(EntityType.Robotic, x, y);
        this.setDisplayName("\u{1F916}");
        this.onGuard = false;
    }

    /**
     * Move function for robot
     * @returns - Return True or False which indicates wether the robot has moved or not
     */
    movePosition() {
        const nearestFuelCell = getNearestFuel(this.cellX, this.cellY, 1);
        let targetCell = null;
        if (nearestFuelCell != null) {
            if (this.onGuard == true) {
                const submarine = findSurroundingCells(EntityType.Submarine, this.cellX, this.cellY, 1).values().next().value;
                // Submarine being the priority target
                // - if within distance
                if (submarine != null) {
                    targetCell = submarine;
                } else {
                    // Move around the cells until submarine has to come close
                    let tempCell = getRandomNearestEmptyCell(this.cellX, this.cellY);
                    while(tempCell == nearestFuelCell || tempCell == this) {
                        tempCell = getRandomNearestEmptyCell(this.cellX, this.cellY);
                    }
                    targetCell = tempCell;
                }
            } else {
                // target fuel for points
                targetCell = this.pathFinder(this.cellX, this.cellY, nearestFuelCell.cellX, nearestFuelCell.cellY);
            }
        } else {
            const submarine = findSurroundingCells(EntityType.Submarine, this.cellX, this.cellY, 1).values().next().value;
            if (submarine != null) {
                targetCell = this.pathFinder(this.cellX, this.cellY, submarine.cellX, submarine.cellY);
            } else {
                // Find new empty cell
                const arbitatryCell = getRandomNearestEmptyCell(this.cellX, this.cellY);
                if (arbitatryCell != null) {
                    targetCell = arbitatryCell;
                } else {
                    // Failed to move, must find a new robot
                    return false;
                }
            }
        }
        // This check for interaction with other cells
        switch(targetCell.entity) {
            case EntityType.Fuel: {
                computerScore += targetCell.fuel;
                // Check if the last fuel entity has been taken
                if (countEntities(EntityType.Fuel) == 1) {
                    handleGameOver();
                }
                break;
            }
            case EntityType.Submarine: {
                const submarine = getSubmarine();
                if (submarine != null) submarine.isDead = true;
                handleGameOver();
                break;
            }
        }

        // Reset old cell + update new cell
        let replacementCell = new Cell(this.cellX, this.cellY);
        replacementCell.replaceCell(" ");

        gridArray[targetCell.cellX][targetCell.cellY] = new RoboticEntity(targetCell.cellX, targetCell.cellY);
        round++;

        return true;
    }

    /**
     * This function finds the shortest path to the target location
     * @param {*} startX
     * @param {*} startY
     * @param {*} targetX 
     * @param {*} targetY 
     * @returns - Return the shortest path 
     */
    pathFinder(startX, startY, targetX, targetY) {
        const movements = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 }, // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }, // Right

            // Diagonal movement
            { dx: 1, dy: 1}, // Down right
            { dx: -1, dy: -1}, // Up left

            { dx: 1, dy: -1}, // Up right
            { dx: -1, dy: 1}, // Down left
        ];
        let availableCells = [];
        for (const movement of movements) {
            const nextX = startX + movement.dx;
            const nextY = startY + movement.dy;
            if (nextX >= 0 && nextX < 10 && nextY >= 0 && nextY < 10) {
                const cell = gridArray[nextX][nextY];
                availableCells.push(cell);
            }
        }
        let prevCell = null;
        let prevDistance = 10;
        for (let i = 0; i < availableCells.length; i++) {
            const cell = availableCells[i];
            const distance = Math.sqrt(Math.pow(cell.cellX - targetX, 2) + Math.pow(cell.cellY - targetY, 2));
            if (distance < prevDistance) {
                prevCell = cell;
                prevDistance = distance;
            }
        }
        return prevCell;
    }
}
class FuelEntity extends Entity {
    constructor(fuel, x, y) {
        super(EntityType.Fuel, x, y);
        this.fuel = fuel;
        this.setDisplayName("\u{26FD}  " + fuel);
    }
}

class Cell extends Entity {
    constructor(x, y) {
        super(EntityType.Cell, x, y);
    }

    /**
     * This method can create a cell or replace the string of the cell
     * @param {String} replacement - The text you want to display on the cell.
     * @returns - Returns cell html element
     */
    create(replacement) {
        let prevElement = document.getElementById("cell-" + this.cellX + "-" + this.cellY);
        if (prevElement == null) {
            let cellWrapper = document.createElement('div');
            cellWrapper.id = "cellwrapper-" + this.cellX + "-" + this.cellY;
            cellWrapper.className = "cell";

            let cell = document.createElement('span');
            cell.id = "cell-" + this.cellX + "-" + this.cellY;
            cell.innerHTML = replacement;

            // On Click
            cellWrapper.addEventListener('click', function(event) {
                let elementWrapper = document.elementFromPoint(event.clientX, event.clientY);
                let split = elementWrapper.id.split("-");
                let cellX = +split[1];
                let cellY = +split[2];
                hasClicked = true;
                lastClickedId = "cell-" + cellX + "-" + cellY;
            });
            cellWrapper.appendChild(cell);

            return cellWrapper;
        }
        prevElement.innerHTML = replacement;
        return prevElement;
    }
}

class ObstacleEntity extends Entity {
    constructor(x, y) {
        super(EntityType.Obstacle, x, y);
        this.setDisplayName("Obstacle");
    }
}

// Custom notifying class that can be use to notify 
// normal messages or an error
class NotifyMessage {
    constructor(errMessage) {
        this.errMessage = errMessage;
    }
    /**
     * Display error message temporarily
     * @method
     */
    notifyError() {
        let errWrapper = document.getElementById('score-wrapper');
        if (errWrapper == null) {
            errWrapper = document.createElement('div');
            errWrapper.id = 'score-wrapper';
            errWrapper.className = "wrapper-info";
        }
        let errMsg = document.createElement('h2');
        errMsg.className = "error-msg";
        errMsg.innerHTML = this.errMessage;

        errWrapper.appendChild(errMsg);
        document.body.appendChild(errWrapper);
        
        setTimeout(function() {
            errWrapper.removeChild(errMsg);
        },750);
    }

    /**
     * Display any kind of message permanently
     * @method
     */
    notify() {
        let errWrapper = document.getElementById('score-wrapper');
        if (errWrapper == null) {
            errWrapper = document.createElement('div');
            errWrapper.id = 'score-wrapper';
            errWrapper.className = "wrapper-info";
        }
        let notifyMsg = document.createElement('h2');
        notifyMsg.id = "permanent-notification";
        notifyMsg.className = "over-message";
        notifyMsg.innerHTML = this.errMessage;

        errWrapper.appendChild(notifyMsg);
        document.body.appendChild(errWrapper);
    }

    /**
     * Remove all permanent notifications.
     */
    removeAll() {
        let errWrapper = document.getElementById('score-wrapper');
        if (errWrapper != null) {
            let notifyMsg = document.getElementById('permanent-notification');
            while(notifyMsg != null) {
                errWrapper.removeChild(notifyMsg);
                notifyMsg = document.getElementById('permanent-notification');
            }
        }
    }
}

/**
 * Custom scoreboard designed to display constant up-to-date data
 * to the clients.
 * @class
 */
class ScoreboardManager {
    hasLoaded = false;
    constructor() {
        //Repeat interval every .2s for scoreboard to automatically update
        this.intervalId = setInterval(this.updateAndInitialise,20);
    }

    /**
     * Scoreboard method will init or update the data retrieved from the list
     * at the top of this file. i.e scoreboardList();
     * @method
     */
    updateAndInitialise() {
        let scoreboardWrapper = document.getElementById('score-wrapper');
        if (scoreboardWrapper == null) {
            scoreboardWrapper = document.createElement('div');
            scoreboardWrapper.id = "score-wrapper";
            scoreboardWrapper.className = "wrapper-info";
        }

        this.bufferList = scoreboardList();
        for (let i = 0; i < this.bufferList.length; i++) {
            let buffer = this.bufferList[i];

            let scoreboardText = document.getElementById("scoreboard-id-"+i);
            if (scoreboardText == null) {
                scoreboardText = document.createElement('h3');
                scoreboardText.id = "scoreboard-id-" + i;
                scoreboardText.className = "title";
            }
            scoreboardText.innerHTML = buffer;
            if (!this.hasLoaded) {
                scoreboardWrapper.appendChild(scoreboardText);
            }
        }

        if (!this.hasLoaded) {
            document.body.appendChild(scoreboardWrapper);
            this.hasLoaded = true;
        }
    }    
}


// ----- { Helper function } -----
// functions below this line are helper functions that support with
// the main solutions.
function getSubmarine() {
    if (!hasGridLoaded) return null;
    let submarineCell = null;
    for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
            let cell = gridArray[x][y];
            if (cell.entity == EntityType.Submarine) {
                submarineCell = cell;
                break;
            }
        }
    }
    return submarineCell;
}

function getSubmarineFuel() {
    let submarineCell = getSubmarine();
    if (submarineCell != null) {
        return submarineCell.currentFuel;
    }
    return -1;
}

/**
 * This function finds the surrounding cells and randomly returns one of the 
 * selected cells.
 * 
 * This function does not find diagonal cells
 * @param {*} cellX 
 * @param {*} cellY 
 * @returns A random cell 1 distance
 */
function getRandomNearestEmptyCell(cellX, cellY) {
    const movements = [
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 1 }, // Down
        { dx: -1, dy: 0 }, // Left
        { dx: 1, dy: 0 }, // Right
    ];
    let availableCells = [];
    for (const movement of movements) {
        const nextX = cellX + movement.dx;
        const nextY = cellY + movement.dy;
        if (nextX >= 0 && nextX < 10 && nextY >= 0 && nextY < 10) {
            const cell = gridArray[nextX][nextY];
            if (cell.entity == EntityType.Cell) {
                availableCells.push(cell);
            }
        }
    }
    const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
    if (availableCells.length > 1) {
        while(randomCell.cellX == cellX && randomCell.cellY == cellY) {
            randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        }
    }
    return randomCell;
}

function countEntities(entityType) {
    let count = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            let cell = gridArray[x][y];
            if (cell.entity == entityType) {
                count++;
            }
        }
    }
    return count;
}

function getNearestFuel(startX, startY) {
    const result = findSurroundingCells(EntityType.Fuel, startX, startY, 1);
    if (result == null || result.size < 1) return null;
    return result.values().next().value;
}

function findSurroundingCells(entityType, startX, startY, radius) {
    if (!hasGridLoaded) return null;

    let count = 1;
    let maxTick = radius;

    const minY = Math.min(Math.max(+startY - radius, 0), 9);
    const maxY = Math.min(Math.max(+startY + radius, 0), 9);

    const minX = Math.min(Math.max(+startX - radius, 0), 9);
    const maxX = Math.min(Math.max(+startX + radius, 0), 9);

    let cellList = new Set();

    while(maxTick > 0 && count > 0) {
        // Left side scan
        for (let leftSide = +startY - count; leftSide >= minY; leftSide--) {
            for (let upSide = +startX - count; upSide >= minX; upSide--) {
                const upCell = gridArray[upSide][leftSide];
                if (upCell.entity == entityType) {
                    if (!cellList.has(upCell)) {
                        cellList.add(upCell);
                        break;
                    }
                }
            }

            for (let downSide = +startX + count; downSide <= maxX; downSide++) {
                const downCell = gridArray[downSide][leftSide];
                if (downCell.entity == entityType) {
                    if (!cellList.has(downCell)) {
                        cellList.add(downCell);
                        break;
                    }
                }
            }
            const cell = gridArray[startX][leftSide];
            if (cell.entity == entityType) {
                if (!cellList.has(cell)) {
                    cellList.add(cell);
                    break;
                }
            }
        }

        // Right side scan
        for (let rightSide = +startY + count; rightSide <= maxY; rightSide++) {
            for (let upSide = +startX - count; upSide >= minX; upSide--) {
                const upCell = gridArray[upSide][rightSide];
                if (upCell.entity == entityType) {
                    if (!cellList.has(upCell)) {
                        cellList.add(upCell);
                        break;
                    }
                }
            }

            for (let downSide = +startX + count; downSide <= maxX; downSide++) {
                const downCell = gridArray[downSide][rightSide];
                if (downCell.entity == entityType) {
                    if (!cellList.has(downCell)) {
                        cellList.add(downCell);
                        break;
                    }
                }
            }
            const cell = gridArray[startX][rightSide];
            if (cell.entity == entityType) {
                if (!cellList.has(cell)) {
                    cellList.add(cell);
                    break;
                }
            }
        }
        // Accounting for x up and down
        // Middle side
        const middleUp = gridArray[Math.min(Math.max(startX - count, 0), 9)][startY];
        const middleDown = gridArray[Math.min(Math.max(startX + count, 0), 9)][startY];
        if (middleDown != null) {
            if (middleDown.entity == entityType) {
                if (!cellList.has(middleDown)) {
                    cellList.add(middleDown);
                }
            }
        }
        if (middleUp != null) {
            if (middleUp.entity == entityType) {
                if (!cellList.has(middleUp)) {
                    cellList.add(middleUp);
                }
            }
        }
        count++;
        maxTick--;
    }
    return cellList;
}

function getDistanceToSubmarine(cell) {
    let submarine = getSubmarine();
    if (submarine == null) {
        return null;
    }
    let distance = Math.sqrt(Math.pow(cell.cellX - submarine.cellX, 2) + Math.pow(cell.cellY - submarine.cellY, 2));
    return distance;
}

function getRobotic() {
    // Add all robot entities into an array and then return a random robot from
    // the array
    let robots = [];
    let index = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            let cell = gridArray[x][y];
            if (cell.entity == EntityType.Robotic) {
                robots[index++] = cell;
            }
        }
    }
    return robots[Math.floor(Math.random() * robots.length)];
}

init();
