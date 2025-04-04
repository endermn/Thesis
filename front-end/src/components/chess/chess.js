import React, { useState, useEffect } from 'react';
import styles from './chessboard.module.css';
import piecesImage from '../../assets/pieces.png';
import { Chess } from 'chess.js';

const getSquareColor = (row, col) => {
  return (row + col) % 2 === 0 ? 'white' : 'black';
};

const getPiecePosition = (piece) => {
  const pieceMap = {
    // White pieces (top row of sprite sheet)
    'K': '0% 0%', 'Q': '20% 0%', 'R': '80% 0%',
    'B': '40% 0%', 'N': '60% 0%', 'P': '100% 0%',

    // Black pieces (bottom row of sprite sheet)
    'k': '0% 100%', 'q': '20% 100%', 'r': '80% 100%',
    'b': '40% 100%', 'n': '60% 100%', 'p': '100% 100%'
  };
  return pieceMap[piece] || 'none';
};

// Convert chess.js board representation to our format
const convertChessJsBoard = (chessInstance) => {
  const board = [];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = chessInstance.board()[y][x];
      if (square) {
        board.push({
          piece: square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase(),
          position: { x, y }
        });
      }
    }
  }

  return board;
};

const generatePieceStyles = (pieces) => {
  return pieces.map(({ piece, position }) => ({
    piece,
    position,
    style: {
      backgroundImage: `url(${piecesImage})`,
      backgroundPosition: getPiecePosition(piece),
      backgroundSize: '600% 200%', // For 6 pieces horizontally, 2 rows vertically
      height: '100%',
      width: '100%'
    }
  }));
};

// Convert position to chess.js format (e.g. {x: 0, y: 0} -> 'a8')
const posToSquare = (pos) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']; // Inverted because our board is 0-indexed from top
  return files[pos.x] + ranks[pos.y];
};

// Convert chess.js square to position (e.g. 'a8' -> {x: 0, y: 0})
const squareToPos = (square) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = '8'.charCodeAt(0) - square.charCodeAt(1);
  return { x: file, y: rank };
};

const Chessboard = React.forwardRef(({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  squareSize = 50,
  onMove,
  isPuzzle,
  editorMode = false,
  onSquareClick,
  allowMoves = true,
  playerColor = "both",
  orientation = "white"
}, ref) => {
  const [game, setGame] = useState(null);
  const [boardPieces, setBoardPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [highlightedSquares, setHighlightedSquares] = useState([]);
  const [legalMoves, setLegalMoves] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    makeMove: (moveNotation) => {
      if (game) {
        try {
          const move = game.move(moveNotation);
          if (move) {
            setBoardPieces(convertChessJsBoard(game));
          }
        } catch (e) {
          console.error("Invalid move:", e);
        }
      }
    },
    getFEN: () => {
      return game ? game.fen() : fen;
    }
  }));

  // Initialize chess game
  useEffect(() => {
    try {
      const chessGame = new Chess(fen);
      setGame(chessGame);
      setBoardPieces(convertChessJsBoard(chessGame));
      setFeedback(null);

      // Reset selection state when FEN changes
      setSelectedPiece(null);
      setHighlightedSquares([]);
      setLegalMoves([]);
    } catch (error) {
      console.error("Invalid FEN:", error);
    }
  }, [fen]);

  // Reset the board to initial position
  const resetBoard = () => {
    if (game) {
      try {
        const chessGame = new Chess(fen);
        setGame(chessGame);
        setBoardPieces(convertChessJsBoard(chessGame));
        setSelectedPiece(null);
        setHighlightedSquares([]);
        setLegalMoves([]);
      } catch (error) {
        console.error("Error resetting board:", error);
      }
    }
  };

  const boardSize = 8;
  const piecesWithStyles = generatePieceStyles(boardPieces);

  const handleSquareClick = (row, col, piece) => {
    // Handle editor mode
    console.log(playerColor)
    if (editorMode && onSquareClick) {
      const square = posToSquare({ x: col, y: row });
      onSquareClick(square);
      return;
    }

    // No game instance yet or moves not allowed
    if (!game || !allowMoves) return;

    // If there's feedback showing, clear it and reset on click
    if (feedback && feedback.type === 'incorrect') {
      setFeedback(null);
      resetBoard();
      return;
    }

    const squareName = posToSquare({ x: col, y: row });

    // If no piece is selected and clicked on a piece, select it
    if (!selectedPiece && piece) {
      // Check if it's the correct turn
      const pieceColor = piece.piece === piece.piece.toUpperCase() ? 'w' : 'b';
      if (playerColor !== 'both') {
        const playerColorCode = playerColor === 'white' ? 'w' : 'b';
        if (pieceColor !== playerColorCode) {
          return; // Not this player's piece
        }
      }

      if (pieceColor !== game.turn()) {
        return; // Not this player's turn
      }

      // Select the piece
      setSelectedPiece({ ...piece, square: squareName });
      setHighlightedSquares([{ x: col, y: row }]);

      // Get legal moves for this piece
      const moves = game.moves({ square: squareName, verbose: true });
      setLegalMoves(moves.map(move => ({
        x: "abcdefgh".indexOf(move.to[0]),
        y: "87654321".indexOf(move.to[1])
      })));

      return;
    }

    // If a piece is already selected
    if (selectedPiece) {
      // Clicking on the same piece - deselect
      if (piece && piece.position.x === selectedPiece.position.x &&
        piece.position.y === selectedPiece.position.y) {
        setSelectedPiece(null);
        setHighlightedSquares([]);
        setLegalMoves([]);
        return;
      }

      // Clicking on a different piece of the same color - select that piece instead
      if (piece) {
        const pieceColor = piece.piece === piece.piece.toUpperCase() ? 'w' : 'b';
        if (pieceColor === game.turn()) {
          // Select this piece instead
          const newSquare = posToSquare({ x: col, y: row });
          setSelectedPiece({ ...piece, square: newSquare });
          setHighlightedSquares([{ x: col, y: row }]);

          // Get legal moves for this piece
          const moves = game.moves({ square: newSquare, verbose: true });
          setLegalMoves(moves.map(move => ({
            x: "abcdefgh".indexOf(move.to[0]),
            y: "87654321".indexOf(move.to[1])
          })));

          return;
        }
      }

      // Attempt to move the selected piece
      const fromSquare = selectedPiece.square;
      const toSquare = squareName;

      try {
        const move = game.move({
          from: fromSquare,
          to: toSquare,
          promotion: 'q' // Auto-promote to queen for simplicity
        });

        if (move) {
          // Update board representation
          setBoardPieces(convertChessJsBoard(game));

          // Call onMove callback if provided
          if (onMove) {
            const moveResult = onMove({
              piece: selectedPiece.piece,
              from: selectedPiece.position,
              to: { x: col, y: row },
              fen: game.fen(),
              move: move
            });

            // Set feedback based on move result
            if (isPuzzle && moveResult === false) {
              setFeedback({
                type: 'incorrect',
                message: 'Incorrect move! Try again.'
              });
            } else if (isPuzzle && moveResult) {
              setFeedback({
                type: 'correct',
                message: 'Correct move!'
              });
            }
          }
        }
      } catch (e) {
        console.error("Invalid move:", e);
      }

      // Reset selection
      setSelectedPiece(null);
      setHighlightedSquares([]);
      setLegalMoves([]);
    }
  };

  const isSquareHighlighted = (row, col) => {
    return highlightedSquares.some(sq => sq.x === col && sq.y === row);
  };

  const isLegalMove = (row, col) => {
    return legalMoves.some(move => move.x === col && move.y === row);
  };

  // Get square name for coordinates
  const getSquareName = (row, col) => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
  };

  return (
    <div className="position-relative">
      <div className="row">
        <div className="col d-flex justify-content-center align-items-center">
          <div
            className={`${styles.chessboard} align-self-center`}
            style={{
              width: `${squareSize * 8}px`,
              height: `${squareSize * 8}px`
            }}
          >
            {Array.from({ length: boardSize }, (_, y) => {
              // const row = orientation === 'black' ? row : boardSize - 1 - row

              return (
                <div key={y} className={styles.chessboardRow}>

                  {Array.from({ length: boardSize }, (_, x) => {
                    // const col = orientation === 'black' ? col : boardSize - 1 - col
                    const squareColor = getSquareColor(y, x);
                    const piece = piecesWithStyles.find((p) => p.position.x === x && p.position.y === y);
                    const isHighlighted = isSquareHighlighted(y, x);
                    const isLegal = isLegalMove(y, x);
                    const squareName = getSquareName(y, x);


                    return (
                      <div
                        key={`${y}-${x}`}
                        className={`${styles.square} ${styles[squareColor]}`}
                        style={{
                          width: `${squareSize}px`,
                          height: `${squareSize}px`,
                          position: 'relative'
                        }}
                        onClick={() => handleSquareClick(y, x, piece)}
                        data-square={squareName}
                      >
                        {editorMode && (
                          <div className={styles.squareLabel} style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            fontSize: '10px',
                            opacity: 0.7,
                            pointerEvents: 'none'
                          }}>
                            {squareName}
                          </div>
                        )}

                        {piece && (
                          <div
                            className={styles.piece}
                            style={piece.style}
                          />
                        )}

                        {isHighlighted && (
                          <div className={styles.highlight} style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(255, 255, 0, 0.4)',
                            pointerEvents: 'none'
                          }} />
                        )}

                        {isLegal && !editorMode && (
                          <div className={styles.legalMove} style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: piece ? '85%' : '30%',
                            height: piece ? '85%' : '30%',
                            borderRadius: piece ? '0' : '50%',
                            border: piece ? '3px solid rgba(82, 178, 227, 0.7)' : 'none',
                            backgroundColor: piece ? 'transparent' : 'rgba(88, 151, 214, 0.5)',
                            pointerEvents: 'none'
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`${styles.feedback} ${feedback.type === 'correct' ? styles.correct : styles.incorrect}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '10px 20px',
            borderRadius: '5px',
            backgroundColor: feedback.type === 'correct' ? 'rgba(0, 128, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            fontWeight: 'bold',
            zIndex: 10,
            cursor: 'pointer'
          }}
          onClick={() => {
            if (feedback.type === 'incorrect') {
              setFeedback(null);
              resetBoard();
            } else {
              setFeedback(null);
            }
          }}
        >
          {feedback.message}
        </div>
      )}

      {!editorMode && game && (
        <div className="mt-3 text-center" style={{ color: 'white' }}>
          {game.turn() === 'w' ? "White's turn" : "Black's turn"}
        </div>
      )}
    </div>
  );
});

export default Chessboard;