/*
 * This script handles Portable Game Notation (PGN) files and outputs individual PGN's generated from
 * subvariations.
 *
 * Author: Jack Tsang
 */

let moveNumberPattern = new RegExp("\\d+\\.", "g");

let moveData = new Array();
let pgnArray = new Array(); // Collection of flattened games
let tempMoveStack = new Stack(); // Variable holds current main move as a temporary variable for subvariations
let mainMoveStack = new Stack(); // Main game stack
let moveNumberStack = new Stack(); // Keeps track of Sub-Variation move numbers
let gameData = {};

let pgn = ["[Event \"Test PGN\"]\n" +
"[Site \"https://lichess.org/\"]\n" +
"[White \"Joe Smith\"]\n" +
"[Black \"John Doe\"]\n" +
"[Result \"*\"]\n" +
"[UTCDate \"2019.10.23\"]\n" +
"[UTCTime \"00:46:21\"]\n" +
"[Variant \"Standard\"]\n" +
"[ECO \"B22\"]\n" +
"[Opening \"Sicilian Defense: Alapin Variation\"]\n" +
"\n" +
"1. e4 (1. d4 g5 2. f4 e5 3. b4) 1... c5 2. c3 f5 3. e5 e6 (3... d5 4. d4 e6 5. f4 (5. f3 g6 (5... g5) 6. g4)) 4. d4 *"];

/*
 * PGN Cleanup and grabbing metadata
 */
pgn = normalizePGN(pgn); // PGN is in array format - this currently peels off the top
gameData = getGameMetadata(pgn);
pgn = removeMarkup(pgn);

// Remove extra white space and separating closing brackets with a space.
pgn = removeExtraCharacters(pgn);
moveData = pgn.split(" ");

let moveCounter = 0;
let legalMove = new RegExp(/^([NBRQK])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[NBRQK])?(\+|#)?$|^O-O(-O)?$/);

// Go through every single move in the PGN
for (const move of moveData) {
    if (move.match(legalMove)) {
        mainMoveStack.push(move);
        moveCounter += 1;
    } else if (move === "(") {
        tempMoveStack.push(mainMoveStack.pop());
        moveNumberStack.push(moveCounter);
    } else if (move === ")") {
        /*
         * Concatenating the game string - move to another function
         */
        let gameString = "";
        let subVariationString = "";
        let currentMove = moveCounter; // Keep track of current move (highest ply hit by sub-variation)
        let subVariationPly = currentMove - moveNumberStack.peek(); // Number of plies in sub-variation to pop

        // Obtain the items from the move stack and put them into an array
        let generateRootMoves = mainMoveStack.printStack().trim().split(" ");

        subVariationString = populateSubvariationMoveList(moveCounter, subVariationPly, generateRootMoves, moveNumberStack.peek());
        gameString = populateMoveList(gameString, generateRootMoves);
        gameString = updatePGNMarkup(gameString, gameData, subVariationString); // Inserting and finalizing into Event Metadata

        // Add PGN to the output array
        pgnArray.push(gameString);

        for (let i = 0; i < subVariationPly; i++) {
            mainMoveStack.pop();
        }
        /* Swap root move back in */

        mainMoveStack.push(tempMoveStack.pop()); // Put the main variation back onto the stack
        moveCounter = moveNumberStack.pop(); // Remove move number tracking current variation
    }

    // End of main game, Append final Main PGN
    else if (move === "*" || move === "1/2-1/2" || move === "1-0" || move === "0-1") {
        let gameString = "";
        let subVariationString = "";

        // Obtain the items from the move stack and put them into an array
        let generateRootMoves = mainMoveStack.printStack().trim().split(" ");

        subVariationString = populateSubvariationMoveList(moveCounter, moveCounter, generateRootMoves, 0); // 0 is white to move.
        gameString = populateMoveList(gameString, generateRootMoves);
        gameString = updatePGNMarkup(gameString, gameData, subVariationString); // Inserting and finalizing into Event Metadata

        // Finalize the PGN
        pgnArray.push(gameString);
    }

    // Null move when entering sub-variations
    else if (move === "..") {
        continue;
    }

    // Invalid / Illegal inputs
    else
        break;
}

/*
 * Test for processing and outputting PGN's
 */
let output = "";
for (const pgn of pgnArray) {
    output += pgn + '\n';
}

/*
 * Testing scaffold that allows output to a text file to a Blob
 */
let textFile = null,
    makeTextFile = function (text) {
        let data = new Blob([text], {type: 'text/plain'});

        // If we are replacing a previously generated file we need to
        // manually revoke the object URL to avoid memory leaks.
        if (textFile !== null) {
            window.URL.revokeObjectURL(textFile);
        }

        textFile = window.URL.createObjectURL(data);

        // returns a URL you can use as a href
        return textFile;
    };
let create = document.getElementById('create'),
    textbox = document.getElementById('textbox');

create.addEventListener('click', function () {
    let link = document.createElement('a');
    link.setAttribute('download', 'info.txt');
    link.href = makeTextFile(output);
    document.body.appendChild(link);

    // wait for the link to be added to the document
    window.requestAnimationFrame(function () {
        let event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
    });

}, false);

function normalizePGN(game) {
    game = game[0];
    game = game.replace("UTCDate", "Date");
    game = game.replace("UTCTime", "Time");
    return game;
}

/*
 * removeMarkUp takes an array of PGN strings and removes the metadata
 * from the PGN string.
 */
function removeMarkup(text) {
    let comments = new RegExp('(\\{[^}]+\\})+?', 'g');
    let noComments = text.replace(comments, '');
    let tagPairs = new RegExp("\\[.*\\]", 'g');
    let noTagPairs = noComments.replace(tagPairs, "");

    // Trim leading whitespace and convert it into a single line
    let finalpgn = noTagPairs.trim();
    return finalpgn;
}

/*
 * Returns Event, White player, Black player, and Date in JSON format
 */
function getGameMetadata(game) {
    let eventTag = game.match("\\[Event \.+\\]");
    let whiteNameTag = game.match("\\[White \.+\\]");
    let blackNameTag = game.match("\\[Black \.+\\]");
    let dateTag = game.match("\\[Date \.+\\]");

    if (eventTag == null) {
        eventTag = "[Event ??]";
    }
    if (whiteNameTag === null) {
        whiteNameTag = "[White \"NN\"]";
    }
    if (blackNameTag === null) {
        blackNameTag = "[Black \"NN\"]";
    }
    if (dateTag == null) {
        dateTag = "[Date " + Date.now() + " ]";
    }

    return {
        "event": eventTag,
        "white": whiteNameTag,
        "black": blackNameTag,
        "date": dateTag
    }
}

/* Removes unnecessary annotations and white space from game string */
function removeExtraCharacters(game) {
    game = game.replace(moveNumberPattern, "").trim().replace(/\$\d+/g, "").replace(/[)]/g, ' )').replace(/[(]/g, ' ( ').replace(/[..]/g, ' .. ').replace(/\s\s+/g, ' ');
    return game;
}

/* Updates PGN with proper markup for future parsing */
function updatePGNMarkup(gameString, gameData, subVariationString) {
    let editedEventData = "";
    if (subVariationString === "") {
        editedEventData = gameData.event[0].slice(0, -2) + ": " + gameString + gameData.event[0].slice(-2);
    } else {
        editedEventData = gameData.event[0].slice(0, -2) + ": " + subVariationString + gameData.event[0].slice(-2);
    }
    gameString = gameData.date + '\n\n' + gameString;
    gameString = gameData.black + '\n' + gameString;
    gameString = gameData.white + '\n' + gameString;
    gameString = editedEventData + '\n' + gameString + '\n';

    return gameString;
}

function populateMoveList(gameString, moveArray) {
    for (let i = 0; i < moveArray.length; i++) {
        // Calculation is divided by 2 + 1 since index starts at 0 and full moves are two plies
        if (i % 2 === 0) {
            gameString += (i / 2 + 1) + ". " + moveArray[i] + " ";
        }
        // Blacks Turn
        else
            gameString += moveArray[i] + " ";
    }
    return gameString;
}

/*
 * Current size of entire variation, sub-variation length, and move list is used to return only game notation
 * of the sub variation eg:
 *
 * 1.e4 d6 ( 1... e5 ) will return 1... e5 as the move string.
 */
function populateSubvariationMoveList(currentMoveSize, lengthOfSubvariation, moveArray, sideToMove) {
    let whiteToMove = false;
    let blackToMove = false;

    // If moveCounter is odd, then it is black's turn to move
    if (sideToMove % 2 == 1) {
        blackToMove = true;
    }
    // Otherwise it's whites turn
    else if (sideToMove % 2 == 0) {
        whiteToMove = true;
    }
    let gameString = "";
    if (whiteToMove) {
        for (let i = 0; i < lengthOfSubvariation; i++) {
            // Calculation is divided by 2 + 1 since index starts at 0 and full moves are two plies
            if (i % 2 === 0) {
                gameString = (Math.floor((currentMoveSize - i - 1) / 2) + 1) + ". " + moveArray[moveArray.length - i - 1] + " " + gameString;
            }
            // Blacks Turn
            else
                gameString = moveArray[moveArray.length - i - 1] + " " + gameString;
        }
    } else if (blackToMove) {
        for (let i = 0; i < lengthOfSubvariation; i++) {
            // Calculation is divided by 2 + 1 since index starts at 0 and full moves are two plies
            if (i % 2 === 1) {
                gameString = (Math.floor((currentMoveSize - i - 1) / 2)) + ". " + moveArray[moveArray.length - i - 1] + " " + gameString;
            }
            // Blacks Turn
            else if (i === lengthOfSubvariation - 1)
                gameString = (Math.floor((currentMoveSize - i - 1) / 2)) + "... " + moveArray[moveArray.length - i - 1];
        }
    }
    return gameString;
}