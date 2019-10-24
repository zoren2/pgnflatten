/*
 * This script handles Portable Game Notation (PGN) files and outputs individual PGN's generated from
 * subvariations.
 *
 * Author: Jack Tsang
 */

let moveNumberPattern = new RegExp("\\d+\\.", "g");

let moveData = new Array();
let tempMoveStack = new Stack(); // Variable holds current main move as a temporary variable for subvariations
let mainMoveStack = new Stack(); // Main game stack
let moveNumberStack = new Stack(); // Keeps track of Sub-Variation move numbers

let pgn = ["[Event \"Test PGN\"]\n" +
"[Site \"https://lichess.org/\"]\n" +
"[Result \"*\"]\n" +
"[UTCDate \"2019.10.23\"]\n" +
"[UTCTime \"00:46:21\"]\n" +
"[Variant \"Standard\"]\n" +
"[ECO \"B22\"]\n" +
"[Opening \"Sicilian Defense: Alapin Variation\"]\n" +
"\n" +
"1. e4 (1. d4 g5 2. f4 e5 3. b4) 1... c5 2. c3 f5 3. e5 e6 (3... d5 4. d4 e6 5. f4 (5. f3 g6 (5... g5) 6. g4)) 4. d4 *"];

// removeMarkUp takes an array of PGN strings
function removeMarkup(text) {
    text = text[0];
    let tagPairs = new RegExp("\\[.*\\]", 'g');
    let noTagPairs = text.replace(tagPairs, "");

    let comments = new RegExp('\\{.*\\}', 'g');
    let noComments = noTagPairs.replace(comments, "");

    // Trim leading whitespace and convert it into a single line
    let finalpgn = noComments.trim();
    return finalpgn;
}

pgn = removeMarkup(pgn);

// Remove extra white space and separating closing brackets with a space.
pgn = pgn.replace(moveNumberPattern, "").trim().replace(/[)]/g, ' )').replace(/[(]/g, ' ( ').replace(/\s\s+/g, ' ');

moveData = pgn.split(" ");
console.log(pgn);
console.log(moveData);

let moveCounter = 0;
let legalMove = new RegExp(/^([NBRQK])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[NBRQK])?(\\+|#)?$|^O-O(-O)?$/);
for (const move of moveData) {
    if (move.match(legalMove)) {
        mainMoveStack.push(move);
        moveCounter += 1;
    } else if (move === "(") {
        tempMoveStack.push(mainMoveStack.pop());
        moveNumberStack.push(moveCounter);
    } else if (move === ")") {
        let currentMove = moveCounter; // Keep track of current move
        moveCounter = moveNumberStack.pop(); // Reset counter to when parser entered the sub-variation
        let subVariationPly = currentMove - moveCounter; // Number of plies in sub-variation to pop
        for (let i = 0; i < subVariationPly; i++) {
            mainMoveStack.pop();
        }
        mainMoveStack.push(tempMoveStack.pop());
    }

    // End of main game, Append final Main PGN
    else if (move === "*" || move === "1/2-1/2" || move === "1-0" || move === "0-1") {
        break;
    }

    // Null move when entering sub-variations
    else if (move === "..") {
        continue;
    }

    // Invalid / Illegal inputs
    else
        break;
}
