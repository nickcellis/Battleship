// Djkisjs algorithm
function findRoute(startX, startY, targetX, targetY) {
    let queue = [];
    let visited = new Set();
    let previousCells = Array.from({ length: 10 }, () => Array(10)); // Array to store distances from the start cell
    let distances = Array.from({ length: 10 }, () => Array(10).fill(gridSize + 5)); // Array to store distances from the start cell
    queue.push(gridArray[startX][startY]);

    while(queue.length > 0) {
        queue.sort((a, b) => Math.sqrt(Math.pow(a.cellX + b.cellX, 2) + Math.pow(a.cellY + b.cellY, 2)));
        const currentCell = queue.shift();
        const { cellX, cellY } = currentCell;
        const distance = parseInt(getDistanceToSubmarine(currentCell));

        if (cellX == targetX && cellY == targetY) {
            let path = [];
            let currentX = cellX;
            let currentY = cellY;
            // Traverse the previous cells from the target cell to the start cell
            while (previousCells[currentX][currentY]) {
                path.unshift(gridArray[currentX][currentY]);
                const { cellX: prevX, cellY: prevY } = previousCells[currentX][currentY];
                currentX = prevX;
                currentY = prevY;
            }
            return path;
        }

        visited.add(currentCell);

        const movements = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 }, // Down 
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }, // Right
        ];

        for (const movement of movements) {
            const nextX = cellX + movement.dx; // Calculate the next x-coordinate
            const nextY = cellY + movement.dy; // Calculate the next y-coordinate
            if (nextX >= 0 && nextX < 10 && nextY >= 0 && nextY < 10) {
                const nextCell = gridArray[nextX][nextY];
                if (nextCell.entity == EntityType.Obstacle || nextCell.entity == EntityType.Robotic) continue;
                if (visited.has(nextCell)) continue;
                const newDistance = distance + 1;
                if (newDistance < distances[nextX][nextY]) {
                    distances[nextX][nextY] = newDistance;
                    previousCells[nextX][nextY] = currentCell;
                    queue.push(nextCell);
                }
            }
        }
    }
    return null;
}
