const appRoot = document.getElementById("app");
const homeButton = document.getElementById("homeButton");
const retryButton = document.getElementById("retryButton");
const submitButton = document.getElementById("submitButton");
const nextButton = document.getElementById("nextButton");
const soundButton = document.getElementById("soundButton");
const resultModal = document.getElementById("resultModal");
const resultEmoji = document.getElementById("resultEmoji");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const modalRetryButton = document.getElementById("modalRetryButton");
const modalNextButton = document.getElementById("modalNextButton");

const praiseMessages = [
  { title: "You solved it!", emoji: "🌟" },
  { title: "Super thinking!", emoji: "🎉" },
  { title: "Great job!", emoji: "🧠" },
];

const gentleMessages = [
  { title: "Great try", emoji: "💛" },
  { title: "Almost there", emoji: "✨" },
  { title: "Try one more time", emoji: "🌈" },
];

const shapeStyle = {
  circle: "shape-circle",
  square: "shape-square",
  triangle: "shape-triangle",
  star: "shape-star",
};

const appState = {
  selectedGameId: null,
  currentLevel: 1,
  starsByGame: {},
  soundEnabled: true,
  activeSelection: null,
  canAdvance: false,
  levelSolved: false,
  previewTimer: null,
};

const helper = {
  createNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  },
  clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  },
  getStars(gameId) {
    return appState.starsByGame[gameId] || 0;
  },
  addStars(gameId, amount) {
    appState.starsByGame[gameId] = helper.getStars(gameId) + amount;
  },
  closeModal() {
    resultModal.classList.add("hidden");
    resultModal.setAttribute("aria-hidden", "true");
  },
  openModal(messagePack, body, canAdvance, nextLabel = "Next Level") {
    resultEmoji.textContent = messagePack.emoji;
    resultTitle.textContent = messagePack.title;
    resultMessage.textContent = body;
    modalNextButton.textContent = nextLabel;
    modalNextButton.disabled = !canAdvance;
    resultModal.classList.remove("hidden");
    resultModal.setAttribute("aria-hidden", "false");
  },
  playTone(type) {
    if (!appState.soundEnabled || typeof AudioContext === "undefined") {
      return;
    }
    const context = helper.audioContext || new AudioContext();
    helper.audioContext = context;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = type === "win" ? "triangle" : "sine";
    oscillator.frequency.value = type === "win" ? 660 : 320;
    gainNode.gain.value = 0.06;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
  },
  renderShapeToken(token, size = 54) {
    if (token.kind === "emoji") {
      const emoji = helper.createNode("span", "token-text", token.value);
      return emoji;
    }

    if (token.kind === "number") {
      const number = helper.createNode("span", "token-text", String(token.value));
      return number;
    }

    const shape = helper.createNode("span", `shape-icon ${shapeStyle[token.shape] || ""}`);
    shape.style.color = token.color;
    if (token.shape === "triangle") {
      shape.style.borderBottomColor = token.color;
    } else {
      shape.style.background = token.color;
      shape.style.width = `${size}px`;
      shape.style.height = `${size}px`;
    }
    return shape;
  },
  tokenLabel(token) {
    if (token.kind === "shape") {
      return `${token.colorName} ${token.shape}`;
    }
    return String(token.value);
  },
  ensureGame() {
    return gameRegistry.find((game) => game.id === appState.selectedGameId);
  },
  stopPreviewTimer() {
    if (appState.previewTimer) {
      window.clearTimeout(appState.previewTimer);
      appState.previewTimer = null;
    }
  },
};

function createPatternLevels() {
  return [
    {
      prompt: "Pick the next train car.",
      sequence: [
        { kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
        { kind: "shape", shape: "square", color: "#51a7f9", colorName: "blue" },
        { kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
      ],
      choices: [
        { id: "a", kind: "shape", shape: "square", color: "#51a7f9", colorName: "blue" },
        { id: "b", kind: "shape", shape: "circle", color: "#ffc94a", colorName: "yellow" },
        { id: "c", kind: "shape", shape: "triangle", color: "#46c8a8", colorName: "green" },
      ],
      correctAnswer: "a",
      hint: "Look for the pattern that repeats: pink, blue, pink...",
      rewardStars: 1,
    },
    {
      prompt: "Find the next pattern piece.",
      sequence: [
        { kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { kind: "shape", shape: "star", color: "#7b64ff", colorName: "purple" },
        { kind: "shape", shape: "star", color: "#7b64ff", colorName: "purple" },
      ],
      choices: [
        { id: "a", kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { id: "b", kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { id: "c", kind: "shape", shape: "star", color: "#7b64ff", colorName: "purple" },
      ],
      correctAnswer: "b",
      hint: "Two yellow triangles, then two purple stars, then it starts again.",
      rewardStars: 1,
    },
    {
      prompt: "What comes next?",
      sequence: [
        { kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
        { kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { kind: "shape", shape: "circle", color: "#46c8a8", colorName: "green" },
        { kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
        { kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
      ],
      choices: [
        { id: "a", kind: "shape", shape: "circle", color: "#ffc94a", colorName: "yellow" },
        { id: "b", kind: "shape", shape: "circle", color: "#46c8a8", colorName: "green" },
        { id: "c", kind: "shape", shape: "square", color: "#46c8a8", colorName: "green" },
      ],
      correctAnswer: "b",
      hint: "The colors move in a row: pink, blue, green.",
      rewardStars: 2,
    },
    {
      prompt: "Choose the next car.",
      sequence: [
        { kind: "shape", shape: "square", color: "#46c8a8", colorName: "green" },
        { kind: "shape", shape: "triangle", color: "#46c8a8", colorName: "green" },
        { kind: "shape", shape: "square", color: "#ff6f7d", colorName: "pink" },
        { kind: "shape", shape: "triangle", color: "#ff6f7d", colorName: "pink" },
      ],
      choices: [
        { id: "a", kind: "shape", shape: "square", color: "#46c8a8", colorName: "green" },
        { id: "b", kind: "shape", shape: "triangle", color: "#51a7f9", colorName: "blue" },
        { id: "c", kind: "shape", shape: "square", color: "#ff6f7d", colorName: "pink" },
      ],
      correctAnswer: "a",
      hint: "The shape changes square, triangle. The color stays green, green, pink, pink.",
      rewardStars: 2,
    },
    {
      prompt: "Which shape finishes the pattern?",
      sequence: [
        { kind: "shape", shape: "star", color: "#ffc94a", colorName: "yellow" },
        { kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { kind: "shape", shape: "star", color: "#ffc94a", colorName: "yellow" },
        { kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { kind: "shape", shape: "star", color: "#ffc94a", colorName: "yellow" },
      ],
      choices: [
        { id: "a", kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { id: "b", kind: "shape", shape: "star", color: "#46c8a8", colorName: "green" },
        { id: "c", kind: "shape", shape: "triangle", color: "#51a7f9", colorName: "blue" },
      ],
      correctAnswer: "a",
      hint: "The train goes star, circle, star, circle.",
      rewardStars: 3,
    },
  ];
}

function createAnimalLevels() {
  return [
    {
      prompt: "Put each animal in the right house.",
      houses: [
        { id: "red", label: "Red", emoji: "🏠" },
        { id: "blue", label: "Blue", emoji: "🏡" },
        { id: "yellow", label: "Yellow", emoji: "🏘️" },
      ],
      animals: [
        { id: "lion", label: "Lion", emoji: "🦁" },
        { id: "cat", label: "Cat", emoji: "🐱" },
        { id: "frog", label: "Frog", emoji: "🐸" },
      ],
      clues: ["Lion is in the red house.", "Cat is in the blue house.", "Frog is in the yellow house."],
      correctAnswer: { red: "lion", blue: "cat", yellow: "frog" },
      hint: "Use one clue for each house.",
      rewardStars: 1,
    },
    {
      prompt: "Read the clues and place them.",
      houses: [
        { id: "red", label: "Red", emoji: "🏠" },
        { id: "blue", label: "Blue", emoji: "🏡" },
        { id: "yellow", label: "Yellow", emoji: "🏘️" },
      ],
      animals: [
        { id: "dog", label: "Dog", emoji: "🐶" },
        { id: "duck", label: "Duck", emoji: "🦆" },
        { id: "rabbit", label: "Rabbit", emoji: "🐰" },
      ],
      clues: ["Duck is not in the red house.", "Rabbit is in the yellow house.", "Dog is in the red house."],
      correctAnswer: { red: "dog", blue: "duck", yellow: "rabbit" },
      hint: "First place the rabbit and the dog, then the last animal has one house left.",
      rewardStars: 1,
    },
    {
      prompt: "Who lives where?",
      houses: [
        { id: "red", label: "Red", emoji: "🏠" },
        { id: "blue", label: "Blue", emoji: "🏡" },
        { id: "green", label: "Green", emoji: "🏚️" },
      ],
      animals: [
        { id: "bear", label: "Bear", emoji: "🐻" },
        { id: "fox", label: "Fox", emoji: "🦊" },
        { id: "owl", label: "Owl", emoji: "🦉" },
      ],
      clues: ["Bear is not in the green house.", "Fox is in the blue house.", "Owl is not in the red house."],
      correctAnswer: { red: "bear", blue: "fox", green: "owl" },
      hint: "Try the clue with the blue house first.",
      rewardStars: 2,
    },
    {
      prompt: "Tap an animal, then tap a house.",
      houses: [
        { id: "red", label: "Red", emoji: "🏠" },
        { id: "blue", label: "Blue", emoji: "🏡" },
        { id: "yellow", label: "Yellow", emoji: "🏘️" },
      ],
      animals: [
        { id: "panda", label: "Panda", emoji: "🐼" },
        { id: "pig", label: "Pig", emoji: "🐷" },
        { id: "koala", label: "Koala", emoji: "🐨" },
      ],
      clues: ["Pig is not in the blue house.", "Koala is in the yellow house.", "Panda is not in the yellow house."],
      correctAnswer: { red: "panda", blue: "pig", yellow: "koala" },
      hint: "Yellow is already taken by the koala.",
      rewardStars: 2,
    },
    {
      prompt: "Use the clues to solve the homes.",
      houses: [
        { id: "red", label: "Red", emoji: "🏠" },
        { id: "blue", label: "Blue", emoji: "🏡" },
        { id: "green", label: "Green", emoji: "🏚️" },
      ],
      animals: [
        { id: "mouse", label: "Mouse", emoji: "🐭" },
        { id: "tiger", label: "Tiger", emoji: "🐯" },
        { id: "monkey", label: "Monkey", emoji: "🐵" },
      ],
      clues: ["Tiger is in the green house.", "Mouse is not in the blue house.", "Monkey is not in the green house."],
      correctAnswer: { red: "mouse", blue: "monkey", green: "tiger" },
      hint: "Place the tiger first, then use the houses left over.",
      rewardStars: 3,
    },
  ];
}

function createSortingLevels() {
  return [
    {
      prompt: "Sort by color.",
      rule: "Put pink shapes in the pink bin and blue shapes in the blue bin.",
      bins: [
        { id: "pink", label: "Pink Bin", accept: (shape) => shape.colorName === "pink" },
        { id: "blue", label: "Blue Bin", accept: (shape) => shape.colorName === "blue" },
      ],
      shapes: [
        { id: "s1", shape: "circle", color: "#ff6f7d", colorName: "pink", size: "small" },
        { id: "s2", shape: "square", color: "#51a7f9", colorName: "blue", size: "small" },
        { id: "s3", shape: "triangle", color: "#ff6f7d", colorName: "pink", size: "small" },
        { id: "s4", shape: "star", color: "#51a7f9", colorName: "blue", size: "small" },
      ],
      correctAnswer: { pink: ["s1", "s3"], blue: ["s2", "s4"] },
      hint: "Look only at the color, not the shape.",
      rewardStars: 1,
    },
    {
      prompt: "Sort by shape.",
      rule: "Put circles in one bin and not-circles in the other bin.",
      bins: [
        { id: "circle", label: "Circle Bin", accept: (shape) => shape.shape === "circle" },
        { id: "other", label: "Other Shapes", accept: (shape) => shape.shape !== "circle" },
      ],
      shapes: [
        { id: "s1", shape: "circle", color: "#ffc94a", colorName: "yellow", size: "small" },
        { id: "s2", shape: "square", color: "#46c8a8", colorName: "green", size: "small" },
        { id: "s3", shape: "circle", color: "#51a7f9", colorName: "blue", size: "small" },
        { id: "s4", shape: "triangle", color: "#ff6f7d", colorName: "pink", size: "small" },
      ],
      correctAnswer: { circle: ["s1", "s3"], other: ["s2", "s4"] },
      hint: "Find the round shapes first.",
      rewardStars: 1,
    },
    {
      prompt: "Sort by size.",
      rule: "Big shapes go left. Small shapes go right.",
      bins: [
        { id: "big", label: "Big Shapes", accept: (shape) => shape.size === "big" },
        { id: "small", label: "Small Shapes", accept: (shape) => shape.size === "small" },
      ],
      shapes: [
        { id: "s1", shape: "square", color: "#ffc94a", colorName: "yellow", size: "big" },
        { id: "s2", shape: "circle", color: "#46c8a8", colorName: "green", size: "small" },
        { id: "s3", shape: "triangle", color: "#51a7f9", colorName: "blue", size: "big" },
        { id: "s4", shape: "star", color: "#ff6f7d", colorName: "pink", size: "small" },
      ],
      correctAnswer: { big: ["s1", "s3"], small: ["s2", "s4"] },
      hint: "Count which shapes are taller and wider.",
      rewardStars: 2,
    },
    {
      prompt: "Use two rules.",
      rule: "Blue shapes go in the ocean bin. Everything else goes in the sunshine bin.",
      bins: [
        { id: "ocean", label: "Ocean Bin", accept: (shape) => shape.colorName === "blue" },
        { id: "sunshine", label: "Sunshine Bin", accept: (shape) => shape.colorName !== "blue" },
      ],
      shapes: [
        { id: "s1", shape: "circle", color: "#51a7f9", colorName: "blue", size: "small" },
        { id: "s2", shape: "square", color: "#ffc94a", colorName: "yellow", size: "big" },
        { id: "s3", shape: "triangle", color: "#51a7f9", colorName: "blue", size: "big" },
        { id: "s4", shape: "star", color: "#46c8a8", colorName: "green", size: "small" },
      ],
      correctAnswer: { ocean: ["s1", "s3"], sunshine: ["s2", "s4"] },
      hint: "Only the blue ones splash into the ocean bin.",
      rewardStars: 2,
    },
    {
      prompt: "Final sorting round.",
      rule: "Stars and triangles go in the pointy bin. Circles and squares go in the smooth bin.",
      bins: [
        { id: "pointy", label: "Pointy Bin", accept: (shape) => ["triangle", "star"].includes(shape.shape) },
        { id: "smooth", label: "Smooth Bin", accept: (shape) => ["circle", "square"].includes(shape.shape) },
      ],
      shapes: [
        { id: "s1", shape: "triangle", color: "#ffc94a", colorName: "yellow", size: "small" },
        { id: "s2", shape: "circle", color: "#46c8a8", colorName: "green", size: "big" },
        { id: "s3", shape: "star", color: "#ff6f7d", colorName: "pink", size: "small" },
        { id: "s4", shape: "square", color: "#51a7f9", colorName: "blue", size: "big" },
      ],
      correctAnswer: { pointy: ["s1", "s3"], smooth: ["s2", "s4"] },
      hint: "Pointy shapes have corners that stick out.",
      rewardStars: 3,
    },
  ];
}

function createMemoryLevels() {
  return [
    {
      prompt: "Remember the glowing path, then tap it in the same order.",
      board: { rows: 4, cols: 4 },
      path: [0, 1, 5],
      correctAnswer: [0, 1, 5],
      hint: "Try saying the path out loud as you watch it.",
      rewardStars: 1,
    },
    {
      prompt: "Watch, wait, then copy.",
      board: { rows: 4, cols: 4 },
      path: [4, 5, 6, 10],
      correctAnswer: [4, 5, 6, 10],
      hint: "The path makes a little line, then goes down.",
      rewardStars: 1,
    },
    {
      prompt: "Can you remember a twist?",
      board: { rows: 4, cols: 4 },
      path: [12, 8, 9, 10, 14],
      correctAnswer: [12, 8, 9, 10, 14],
      hint: "Look where the turn happens in the middle.",
      rewardStars: 2,
    },
    {
      prompt: "Longer path now.",
      board: { rows: 4, cols: 4 },
      path: [3, 7, 6, 5, 9, 13],
      correctAnswer: [3, 7, 6, 5, 9, 13],
      hint: "Follow the path like your finger is drawing it.",
      rewardStars: 2,
    },
    {
      prompt: "Final memory trail.",
      board: { rows: 4, cols: 4 },
      path: [0, 4, 8, 9, 10, 6, 2],
      correctAnswer: [0, 4, 8, 9, 10, 6, 2],
      hint: "Notice the big line first, then the turn back up.",
      rewardStars: 3,
    },
  ];
}

function createFinishSequenceLevels() {
  return [
    {
      prompt: "Tap the picture that fills the empty spot.",
      sequence: [
        { kind: "emoji", value: "🍎" },
        { kind: "emoji", value: "🍌" },
        { kind: "emoji", value: "🍎" },
        null,
      ],
      choices: [
        { id: "a", kind: "emoji", value: "🍌" },
        { id: "b", kind: "emoji", value: "🍇" },
        { id: "c", kind: "emoji", value: "🍎" },
      ],
      correctAnswer: "a",
      hint: "The fruit goes apple, banana, apple...",
      rewardStars: 1,
    },
    {
      prompt: "Pick the missing picture.",
      sequence: [
        { kind: "emoji", value: "🌞" },
        { kind: "emoji", value: "🌙" },
        { kind: "emoji", value: "⭐" },
        { kind: "emoji", value: "🌞" },
        null,
      ],
      choices: [
        { id: "a", kind: "emoji", value: "🌙" },
        { id: "b", kind: "emoji", value: "⭐" },
        { id: "c", kind: "emoji", value: "☁️" },
      ],
      correctAnswer: "a",
      hint: "The sky pictures repeat in the same order.",
      rewardStars: 1,
    },
    {
      prompt: "Finish the number line.",
      sequence: [
        { kind: "number", value: 2 },
        { kind: "number", value: 4 },
        { kind: "number", value: 6 },
        null,
      ],
      choices: [
        { id: "a", kind: "number", value: 7 },
        { id: "b", kind: "number", value: 8 },
        { id: "c", kind: "number", value: 10 },
      ],
      correctAnswer: "b",
      hint: "Count by twos.",
      rewardStars: 2,
    },
    {
      prompt: "Which one fits the missing spot?",
      sequence: [
        { kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
        { kind: "shape", shape: "triangle", color: "#51a7f9", colorName: "blue" },
        { kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
        { kind: "shape", shape: "triangle", color: "#51a7f9", colorName: "blue" },
        null,
      ],
      choices: [
        { id: "a", kind: "shape", shape: "circle", color: "#ff6f7d", colorName: "pink" },
        { id: "b", kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { id: "c", kind: "shape", shape: "square", color: "#51a7f9", colorName: "blue" },
      ],
      correctAnswer: "a",
      hint: "It flips back and forth between two shapes.",
      rewardStars: 2,
    },
    {
      prompt: "Finish the counting jump.",
      sequence: [
        { kind: "number", value: 1 },
        { kind: "number", value: 3 },
        { kind: "number", value: 5 },
        { kind: "number", value: 7 },
        null,
      ],
      choices: [
        { id: "a", kind: "number", value: 8 },
        { id: "b", kind: "number", value: 9 },
        { id: "c", kind: "number", value: 10 },
      ],
      correctAnswer: "b",
      hint: "These are odd numbers, counting up by two.",
      rewardStars: 3,
    },
  ];
}

function createMazeLevels() {
  return [
    {
      prompt: "Move through the maze and collect 1, then 2, then go to the star.",
      board: [
        ["start", "empty", "one", "wall", "wall"],
        ["wall", "empty", "empty", "wall", "wall"],
        ["wall", "wall", "empty", "two", "wall"],
        ["wall", "wall", "empty", "empty", "goal"],
        ["wall", "wall", "wall", "wall", "wall"],
      ],
      order: ["one", "two"],
      start: [0, 0],
      goal: [3, 4],
      correctAnswer: "maze-complete",
      hint: "Pick up the numbers in order before the star.",
      rewardStars: 1,
    },
    {
      prompt: "Collect A then B, then finish.",
      board: [
        ["start", "empty", "wall", "empty", "goal"],
        ["wall", "empty", "wall", "empty", "wall"],
        ["a", "empty", "empty", "b", "wall"],
        ["wall", "wall", "wall", "empty", "wall"],
        ["wall", "wall", "wall", "wall", "wall"],
      ],
      order: ["a", "b"],
      start: [0, 0],
      goal: [0, 4],
      correctAnswer: "maze-complete",
      hint: "You can only win if the letters are picked up in order.",
      rewardStars: 1,
    },
    {
      prompt: "Collect moon, then sun, then reach the star.",
      board: [
        ["start", "empty", "moon", "wall", "wall"],
        ["wall", "empty", "empty", "empty", "wall"],
        ["wall", "sun", "wall", "empty", "goal"],
        ["wall", "empty", "empty", "empty", "wall"],
        ["wall", "wall", "wall", "wall", "wall"],
      ],
      order: ["moon", "sun"],
      start: [0, 0],
      goal: [2, 4],
      correctAnswer: "maze-complete",
      hint: "Touch the moon before the sun.",
      rewardStars: 2,
    },
    {
      prompt: "Collect 1, 2, 3 in order.",
      board: [
        ["start", "empty", "wall", "three", "goal"],
        ["wall", "empty", "wall", "empty", "wall"],
        ["one", "empty", "two", "empty", "wall"],
        ["wall", "empty", "empty", "empty", "wall"],
        ["wall", "wall", "wall", "wall", "wall"],
      ],
      order: ["one", "two", "three"],
      start: [0, 0],
      goal: [0, 4],
      correctAnswer: "maze-complete",
      hint: "Do not rush to the star before the numbers.",
      rewardStars: 2,
    },
    {
      prompt: "Final maze: apple, banana, cherry, then star.",
      board: [
        ["start", "empty", "apple", "wall", "goal"],
        ["wall", "empty", "wall", "empty", "wall"],
        ["banana", "empty", "cherry", "empty", "wall"],
        ["wall", "empty", "empty", "empty", "wall"],
        ["wall", "wall", "wall", "wall", "wall"],
      ],
      order: ["apple", "banana", "cherry"],
      start: [0, 0],
      goal: [0, 4],
      correctAnswer: "maze-complete",
      hint: "Plan the order before you move too far.",
      rewardStars: 3,
    },
  ];
}

function createOddLevels() {
  return [
    {
      prompt: "Tap the one that does not match.",
      choices: [
        { id: "a", kind: "emoji", value: "🐶", label: "dog" },
        { id: "b", kind: "emoji", value: "🐱", label: "cat" },
        { id: "c", kind: "emoji", value: "🐭", label: "mouse" },
        { id: "d", kind: "emoji", value: "🍎", label: "apple" },
      ],
      correctAnswer: "d",
      hint: "Three are animals. One is a fruit.",
      rewardStars: 1,
    },
    {
      prompt: "Which one is different?",
      choices: [
        { id: "a", kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { id: "b", kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
        { id: "c", kind: "shape", shape: "square", color: "#51a7f9", colorName: "blue" },
        { id: "d", kind: "shape", shape: "circle", color: "#51a7f9", colorName: "blue" },
      ],
      correctAnswer: "c",
      hint: "Three are the same shape.",
      rewardStars: 1,
    },
    {
      prompt: "Find the odd one out.",
      choices: [
        { id: "a", kind: "emoji", value: "🌞", label: "sun" },
        { id: "b", kind: "emoji", value: "🌙", label: "moon" },
        { id: "c", kind: "emoji", value: "⭐", label: "star" },
        { id: "d", kind: "emoji", value: "🚗", label: "car" },
      ],
      correctAnswer: "d",
      hint: "Three belong in the sky.",
      rewardStars: 2,
    },
    {
      prompt: "Tap the one that breaks the pattern.",
      choices: [
        { id: "a", kind: "number", value: 2, label: "two" },
        { id: "b", kind: "number", value: 4, label: "four" },
        { id: "c", kind: "number", value: 6, label: "six" },
        { id: "d", kind: "number", value: 7, label: "seven" },
      ],
      correctAnswer: "d",
      hint: "Three are even numbers.",
      rewardStars: 2,
    },
    {
      prompt: "One shape is different. Which one?",
      choices: [
        { id: "a", kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { id: "b", kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { id: "c", kind: "shape", shape: "triangle", color: "#ffc94a", colorName: "yellow" },
        { id: "d", kind: "shape", shape: "triangle", color: "#46c8a8", colorName: "green" },
      ],
      correctAnswer: "d",
      hint: "Three match in both shape and color.",
      rewardStars: 3,
    },
  ];
}

const patternLevels = createPatternLevels();
const animalLevels = createAnimalLevels();
const sortingLevels = createSortingLevels();
const memoryLevels = createMemoryLevels();
const finishSequenceLevels = createFinishSequenceLevels();
const mazeLevels = createMazeLevels();
const oddLevels = createOddLevels();

function createSequenceGame(definition) {
  return {
    ...definition,
    createLevel(levelNumber) {
      return definition.levels[Math.min(levelNumber - 1, definition.levels.length - 1)];
    },
    checkAnswer(levelData, userInput) {
      return userInput === levelData.correctAnswer;
    },
    render(container, levelData, callbacks) {
      const promptCard = helper.createNode("div", "prompt-card");
      promptCard.append(helper.createNode("h3", null, levelData.prompt));
      promptCard.append(helper.createNode("p", "helper-copy", definition.helperText));
      container.append(promptCard);

      const patternSection = helper.createNode("section", "play-section play-section--pattern");
      patternSection.append(helper.createNode("h4", "section-label", definition.slotMode ? "Pattern with a missing spot" : "Pattern to finish"));

      const sequenceRow = helper.createNode("div", definition.slotMode ? "sequence-slots" : "sequence-row");
      levelData.sequence.forEach((token, index) => {
        const item = helper.createNode("div", definition.slotMode ? "sequence-slot" : "sequence-item");
        if (definition.slotMode && token === null) {
          item.textContent = "?";
          if (appState.activeSelection) {
            item.classList.add("is-filled");
            const chosen = levelData.choices.find((choice) => choice.id === appState.activeSelection);
            if (chosen) {
              item.textContent = "";
              item.append(helper.renderShapeToken(chosen));
              item.append(helper.createNode("span", "small-note", helper.tokenLabel(chosen)));
            }
          }
        } else {
          item.append(helper.renderShapeToken(token));
          item.append(helper.createNode("span", "small-note", helper.tokenLabel(token)));
        }
        sequenceRow.append(item);
      });
      patternSection.append(sequenceRow);
      container.append(patternSection);

      const optionsSection = helper.createNode("section", "play-section play-section--options");
      optionsSection.append(helper.createNode("h4", "section-label", "Pick one answer"));
      const choicesGrid = helper.createNode("div", "choices-grid");
      levelData.choices.forEach((choice) => {
        const card = helper.createNode("button", "choice-card");
        if (appState.activeSelection === choice.id) {
          card.classList.add("is-selected");
        }
        card.addEventListener("click", () => callbacks.setSelection(choice.id));
        card.append(helper.renderShapeToken(choice));
        card.append(helper.createNode("span", "small-note", helper.tokenLabel(choice)));
        choicesGrid.append(card);
      });
      optionsSection.append(choicesGrid);
      container.append(optionsSection);
    },
  };
}

const gameRegistry = [
  createSequenceGame({
    id: "pattern-train",
    title: "Pattern Train",
    icon: "🚂",
    description: "Spot what comes next in shape and color patterns.",
    difficultyLabel: "Easy to medium",
    helperText: "Tap the next train car that keeps the pattern going.",
    levels: patternLevels,
  }),
  {
    id: "animal-logic",
    title: "Animal Logic Puzzles",
    icon: "🐾",
    description: "Use clues to put animals into the right houses.",
    difficultyLabel: "Reasoning",
    createLevel(levelNumber) {
      return animalLevels[Math.min(levelNumber - 1, animalLevels.length - 1)];
    },
    checkAnswer(levelData, userInput) {
      return levelData.houses.every((house) => userInput?.placements?.[house.id] === levelData.correctAnswer[house.id]);
    },
    render(container, levelData, callbacks) {
      const promptCard = helper.createNode("div", "prompt-card");
      promptCard.append(helper.createNode("h3", null, levelData.prompt));
      promptCard.append(helper.createNode("p", "helper-copy", "Tap an animal card, then tap the house where it belongs."));
      container.append(promptCard);

      const clueList = helper.createNode("div", "clue-list");
      levelData.clues.forEach((clue) => {
        clueList.append(helper.createNode("span", "clue-pill", clue));
      });
      container.append(clueList);

      const housesGrid = helper.createNode("div", "houses-grid");
      const placements = appState.activeSelection?.placements || {};
      const selectedAnimal = appState.activeSelection?.selectedAnimalId || null;
      levelData.houses.forEach((house) => {
        const houseCard = helper.createNode("button", `house-card house-card--${house.id}`);
        if (appState.activeSelection?.selectedHouseId === house.id) {
          houseCard.classList.add("is-selected");
        }
        const top = helper.createNode("div", "house-top", house.emoji);
        const name = helper.createNode("strong", null, `${house.label} House`);
        const slot = helper.createNode("div", "house-slot");
        const animalId = placements[house.id];
        const animal = levelData.animals.find((entry) => entry.id === animalId);
        slot.textContent = animal ? animal.emoji : "❔";
        houseCard.addEventListener("click", () => {
          const nextSelection = structuredClone(appState.activeSelection || { placements: {}, selectedAnimalId: null, selectedHouseId: null });
          nextSelection.selectedHouseId = house.id;
          if (nextSelection.selectedAnimalId) {
            Object.keys(nextSelection.placements).forEach((key) => {
              if (nextSelection.placements[key] === nextSelection.selectedAnimalId) {
                delete nextSelection.placements[key];
              }
            });
            nextSelection.placements[house.id] = nextSelection.selectedAnimalId;
            nextSelection.selectedAnimalId = null;
          }
          callbacks.setSelection(nextSelection);
        });
        houseCard.append(top, name, slot);
        housesGrid.append(houseCard);
      });
      container.append(housesGrid);

      const trayTitle = helper.createNode("p", "helper-copy", selectedAnimal ? "Now tap a house to place your animal." : "Pick an animal to place.");
      container.append(trayTitle);

      const animalTray = helper.createNode("div", "animal-tray");
      levelData.animals.forEach((animal) => {
        const isPlaced = Object.values(placements).includes(animal.id);
        const animalCard = helper.createNode("button", "animal-card");
        animalCard.append(helper.createNode("span", "token-text", animal.emoji));
        animalCard.append(helper.createNode("span", "small-note", animal.label));
        if (isPlaced) {
          animalCard.classList.add("is-placed");
        }
        if (selectedAnimal === animal.id) {
          animalCard.classList.add("is-selected");
        }
        animalCard.addEventListener("click", () => {
          const nextSelection = structuredClone(appState.activeSelection || { placements: {}, selectedAnimalId: null, selectedHouseId: null });
          nextSelection.selectedAnimalId = animal.id;
          callbacks.setSelection(nextSelection);
        });
        animalTray.append(animalCard);
      });
      container.append(animalTray);
    },
  },
  {
    id: "shape-sorting",
    title: "Shape Sorting Lab",
    icon: "🧪",
    description: "Sort shapes into the right bins by color, type, or size.",
    difficultyLabel: "Easy to medium",
    createLevel(levelNumber) {
      return sortingLevels[Math.min(levelNumber - 1, sortingLevels.length - 1)];
    },
    checkAnswer(levelData, userInput) {
      const assignments = userInput?.assignments || {};
      return levelData.shapes.every((shape) => levelData.bins.some((bin) => assignments[shape.id] === bin.id && bin.accept(shape)));
    },
    render(container, levelData, callbacks) {
      const promptCard = helper.createNode("div", "prompt-card");
      promptCard.append(helper.createNode("h3", null, levelData.prompt));
      promptCard.append(helper.createNode("p", "helper-copy", levelData.rule));
      container.append(promptCard);

      const bins = helper.createNode("div", "sorting-bins");
      const assignments = appState.activeSelection?.assignments || {};
      const selectedShapeId = appState.activeSelection?.selectedShapeId || null;
      levelData.bins.forEach((bin) => {
        const binCard = helper.createNode("button", "bin-card");
        if (appState.activeSelection?.selectedBinId === bin.id) {
          binCard.classList.add("is-selected");
        }
        binCard.addEventListener("click", () => {
          const nextSelection = structuredClone(appState.activeSelection || { assignments: {}, selectedShapeId: null, selectedBinId: null });
          nextSelection.selectedBinId = bin.id;
          if (nextSelection.selectedShapeId) {
            nextSelection.assignments[nextSelection.selectedShapeId] = bin.id;
            nextSelection.selectedShapeId = null;
          }
          callbacks.setSelection(nextSelection);
        });
        binCard.append(helper.createNode("strong", null, bin.label));
        const drop = helper.createNode("div", "bin-drop");
        levelData.shapes
          .filter((shape) => assignments[shape.id] === bin.id)
          .forEach((shape) => {
            const node = helper.renderShapeToken({ kind: "shape", shape: shape.shape, color: shape.color, colorName: shape.colorName }, shape.size === "big" ? 56 : 38);
            drop.append(node);
          });
        binCard.append(drop);
        bins.append(binCard);
      });
      container.append(bins);

      container.append(helper.createNode("p", "helper-copy", selectedShapeId ? "Now tap a bin." : "Tap a shape, then tap the matching bin."));

      const pool = helper.createNode("div", "shape-pool");
      levelData.shapes.forEach((shape) => {
        const shapeButton = helper.createNode("button", "shape-chip");
        const assigned = assignments[shape.id];
        if (selectedShapeId === shape.id) {
          shapeButton.classList.add("is-selected");
        }
        shapeButton.append(
          helper.renderShapeToken({ kind: "shape", shape: shape.shape, color: shape.color, colorName: shape.colorName }, shape.size === "big" ? 56 : 38),
          helper.createNode("span", "small-note", assigned ? `In ${levelData.bins.find((bin) => bin.id === assigned)?.label}` : `${shape.colorName} ${shape.shape}`)
        );
        shapeButton.addEventListener("click", () => {
          const nextSelection = structuredClone(appState.activeSelection || { assignments: {}, selectedShapeId: null, selectedBinId: null });
          nextSelection.selectedShapeId = shape.id;
          callbacks.setSelection(nextSelection);
        });
        pool.append(shapeButton);
      });
      container.append(pool);
    },
  },
  {
    id: "memory-path",
    title: "Memory Path",
    icon: "✨",
    description: "Watch a path glow, then tap the same path in order.",
    difficultyLabel: "Memory",
    createLevel(levelNumber) {
      return memoryLevels[Math.min(levelNumber - 1, memoryLevels.length - 1)];
    },
    checkAnswer(levelData, userInput) {
      return JSON.stringify(userInput?.path || []) === JSON.stringify(levelData.correctAnswer);
    },
    render(container, levelData, callbacks) {
      const promptCard = helper.createNode("div", "prompt-card");
      promptCard.append(helper.createNode("h3", null, levelData.prompt));
      promptCard.append(helper.createNode("p", "helper-copy", "Watch the blue lights. When they disappear, tap the same squares in order."));
      container.append(promptCard);

      const board = helper.createNode("div", "memory-grid");
      const currentPath = appState.activeSelection?.path || [];
      const previewDone = appState.activeSelection?.previewDone || false;
      const previewCells = !previewDone ? levelData.path : [];
      const mistakeAt = appState.activeSelection?.mistakeAt ?? -1;
      for (let index = 0; index < levelData.board.rows * levelData.board.cols; index += 1) {
        const cell = helper.createNode("button", "memory-cell");
        cell.textContent = currentPath.indexOf(index) > -1 ? "●" : "";
        if (previewCells.includes(index)) {
          cell.classList.add("is-preview");
        }
        if (currentPath.includes(index)) {
          cell.classList.add("is-selected");
          if (levelData.path[currentPath.indexOf(index)] === index) {
            cell.classList.add("is-correct");
          }
        }
        if (mistakeAt === index) {
          cell.classList.add("is-miss");
        }
        cell.addEventListener("click", () => {
          if (!previewDone) {
            return;
          }
          const nextSelection = structuredClone(appState.activeSelection || { path: [], previewDone: true, mistakeAt: -1 });
          if (nextSelection.path.includes(index)) {
            return;
          }
          nextSelection.path.push(index);
          const step = nextSelection.path.length - 1;
          nextSelection.mistakeAt = levelData.path[step] === index ? -1 : index;
          callbacks.setSelection(nextSelection);
        });
        board.append(cell);
      }
      container.append(board);

      container.append(helper.createNode("p", "hint-text", previewDone ? "Tap the path, then press Check." : "Watching the path..."));

      if (!previewDone && !appState.previewTimer) {
        appState.previewTimer = window.setTimeout(() => {
          appState.previewTimer = null;
          const nextSelection = structuredClone(appState.activeSelection || { path: [], previewDone: false, mistakeAt: -1 });
          nextSelection.previewDone = true;
          renderCurrentGame(nextSelection);
        }, 1600);
      }
    },
  },
  createSequenceGame({
    id: "finish-sequence",
    title: "Finish the Sequence",
    icon: "🔢",
    description: "Fill the missing piece in a number or picture pattern.",
    difficultyLabel: "Pattern builder",
    helperText: "Look at the row and tap the piece that belongs in the empty spot.",
    levels: finishSequenceLevels,
    slotMode: true,
  }),
  {
    id: "mini-maze",
    title: "Mini Maze With Rules",
    icon: "🗺️",
    description: "Move through a maze and collect items in the right order.",
    difficultyLabel: "Planning",
    createLevel(levelNumber) {
      return mazeLevels[Math.min(levelNumber - 1, mazeLevels.length - 1)];
    },
    checkAnswer(levelData, userInput) {
      return Boolean(userInput?.completed);
    },
    render(container, levelData, callbacks) {
      const promptCard = helper.createNode("div", "prompt-card");
      promptCard.append(helper.createNode("h3", null, levelData.prompt));
      promptCard.append(helper.createNode("p", "helper-copy", "Tap a neighboring square to move. Collect the icons in order, then reach the star."));
      container.append(promptCard);

      const tokenRow = helper.createNode("div", "token-row");
      const collected = appState.activeSelection?.collected || [];
      levelData.order.forEach((token, index) => {
        const pill = helper.createNode("span", "token-pill", `${labelMazeToken(token)} ${mazeTokenEmoji(token)}`);
        if (collected[index] === token) {
          pill.style.background = "rgba(70, 200, 168, 0.18)";
        }
        tokenRow.append(pill);
      });
      container.append(tokenRow);

      const maze = helper.createNode("div", "maze-grid");
      const player = appState.activeSelection?.player || levelData.start;
      for (let row = 0; row < levelData.board.length; row += 1) {
        for (let col = 0; col < levelData.board[row].length; col += 1) {
          const cellValue = levelData.board[row][col];
          const cell = helper.createNode("button", "maze-cell");
          const isWall = cellValue === "wall";
          const isPlayer = player[0] === row && player[1] === col;
          const isGoal = cellValue === "goal";
          if (isWall) {
            cell.classList.add("wall");
            maze.append(cell);
            continue;
          }
          if (isGoal) {
            cell.classList.add("goal");
          }
          if (isPlayer) {
            cell.classList.add("player");
            cell.textContent = "🙂";
          } else if (cellValue === "one") {
            cell.textContent = "1";
          } else if (cellValue === "two") {
            cell.textContent = "2";
          } else if (cellValue === "three") {
            cell.textContent = "3";
          } else if (cellValue === "a" || cellValue === "b") {
            cell.textContent = cellValue.toUpperCase();
          } else if (cellValue === "moon") {
            cell.textContent = "🌙";
          } else if (cellValue === "sun") {
            cell.textContent = "🌞";
          } else if (cellValue === "apple") {
            cell.textContent = "🍎";
          } else if (cellValue === "banana") {
            cell.textContent = "🍌";
          } else if (cellValue === "cherry") {
            cell.textContent = "🍒";
          } else if (isGoal) {
            cell.textContent = "⭐";
          }

          if (collected.includes(cellValue)) {
            cell.classList.add("order-hit");
          }

          const isNeighbor = Math.abs(player[0] - row) + Math.abs(player[1] - col) === 1;
          cell.addEventListener("click", () => {
            if (!isNeighbor) {
              return;
            }
            const nextSelection = structuredClone(
              appState.activeSelection || { player: levelData.start.slice(), collected: [], orderIndex: 0, completed: false, badOrder: false }
            );
            nextSelection.player = [row, col];
            const stepValue = levelData.board[row][col];
            const expected = levelData.order[nextSelection.orderIndex];
            nextSelection.badOrder = false;
            if (levelData.order.includes(stepValue) && !nextSelection.collected.includes(stepValue)) {
              if (stepValue === expected) {
                nextSelection.collected.push(stepValue);
                nextSelection.orderIndex += 1;
              } else {
                nextSelection.badOrder = true;
              }
            }
            nextSelection.completed = stepValue === "goal" && nextSelection.collected.length === levelData.order.length && !nextSelection.badOrder;
            callbacks.setSelection(nextSelection);
          });
          maze.append(cell);
        }
      }
      container.append(maze);

      container.append(
        helper.createNode(
          "p",
          "hint-text",
          appState.activeSelection?.badOrder ? "Oops, that item was out of order. Try a new path with Play Again." : "Collect in order, then press Check at the star."
        )
      );
    },
  },
  {
    id: "odd-one-out",
    title: "Odd One Out",
    icon: "🧩",
    description: "Find the picture that does not belong with the others.",
    difficultyLabel: "Reasoning",
    createLevel(levelNumber) {
      return oddLevels[Math.min(levelNumber - 1, oddLevels.length - 1)];
    },
    checkAnswer(levelData, userInput) {
      return userInput === levelData.correctAnswer;
    },
    render(container, levelData, callbacks) {
      const promptCard = helper.createNode("div", "prompt-card");
      promptCard.append(helper.createNode("h3", null, levelData.prompt));
      promptCard.append(helper.createNode("p", "helper-copy", "Three belong together. Tap the one that does not belong."));
      container.append(promptCard);

      const grid = helper.createNode("div", "odd-grid");
      levelData.choices.forEach((choice) => {
        const card = helper.createNode("button", "odd-card");
        if (appState.activeSelection === choice.id) {
          card.classList.add("is-selected");
        }
        card.addEventListener("click", () => callbacks.setSelection(choice.id));
        card.append(helper.renderShapeToken(choice), helper.createNode("span", "small-note", choice.label || helper.tokenLabel(choice)));
        grid.append(card);
      });
      container.append(grid);
    },
  },
];

function mazeTokenEmoji(token) {
  const map = {
    one: "1️⃣",
    two: "2️⃣",
    three: "3️⃣",
    a: "🅰️",
    b: "🅱️",
    moon: "🌙",
    sun: "🌞",
    apple: "🍎",
    banana: "🍌",
    cherry: "🍒",
  };
  return map[token] || "⭐";
}

function labelMazeToken(token) {
  const map = {
    one: "1",
    two: "2",
    three: "3",
    a: "A",
    b: "B",
    moon: "Moon",
    sun: "Sun",
    apple: "Apple",
    banana: "Banana",
    cherry: "Cherry",
  };
  return map[token] || token;
}

function getCurrentLevelData() {
  const game = helper.ensureGame();
  return game ? game.createLevel(appState.currentLevel) : null;
}

function getDefaultSelection(game, levelData) {
  if (game.id === "animal-logic") {
    return { placements: {}, selectedAnimalId: null, selectedHouseId: null };
  }
  if (game.id === "shape-sorting") {
    return { assignments: {}, selectedShapeId: null, selectedBinId: null };
  }
  if (game.id === "memory-path") {
    return { path: [], previewDone: false, mistakeAt: -1 };
  }
  if (game.id === "mini-maze") {
    return { player: levelData.start.slice(), collected: [], orderIndex: 0, completed: false, badOrder: false };
  }
  return null;
}

function renderHome() {
  helper.closeModal();
  helper.stopPreviewTimer();
  appState.selectedGameId = null;
  appState.currentLevel = 1;
  appState.activeSelection = null;
  appState.canAdvance = false;
  appState.levelSolved = false;
  refreshToolbar();
  helper.clearNode(appRoot);

  const panel = helper.createNode("section", "panel");
  const hero = helper.createNode("div", "home-hero");
  const copy = helper.createNode("div", "home-hero-copy");
  copy.append(helper.createNode("p", "eyebrow", "Seven mini-games"));
  copy.append(helper.createNode("h2", "screen-title", "Play, think, and find the pattern"));
  copy.append(
    helper.createNode(
      "p",
      "helper-copy",
      "Each game is built for young learners with big tap targets, gentle hints, and no timers. Pick any card to jump right in."
    )
  );
  const heroBadges = helper.createNode("div", "hero-badges");
  heroBadges.append(
    helper.createNode("span", "hero-badge", "🖱️ Tap only"),
    helper.createNode("span", "hero-badge", "🌈 No rush"),
    helper.createNode("span", "hero-badge", "⭐ Earn stars")
  );
  copy.append(heroBadges);
  hero.append(copy, helper.createNode("div", "hero-art"));
  panel.append(hero);

  const grid = helper.createNode("div", "game-grid");
  gameRegistry.forEach((game) => {
    const card = helper.createNode("button", "game-card");
    card.addEventListener("click", () => startGame(game.id));
    card.append(helper.createNode("div", "game-card-icon", game.icon));
    card.append(helper.createNode("h3", null, game.title));
    card.append(helper.createNode("p", null, game.description));
    card.append(helper.createNode("div", "stars-row", `Stars earned: ${helper.getStars(game.id)} ⭐`));
    grid.append(card);
  });
  panel.append(grid);
  appRoot.append(panel);
}

function refreshToolbar() {
  const inGame = Boolean(appState.selectedGameId);
  homeButton.disabled = !inGame;
  retryButton.disabled = !inGame;
  submitButton.disabled = !inGame || appState.levelSolved;
  nextButton.disabled = !inGame || !appState.canAdvance;
  soundButton.textContent = `Sound: ${appState.soundEnabled ? "On" : "Off"}`;
}

function startGame(gameId) {
  helper.closeModal();
  helper.stopPreviewTimer();
  appState.selectedGameId = gameId;
  appState.currentLevel = 1;
  appState.canAdvance = false;
  appState.levelSolved = false;
  const game = helper.ensureGame();
  const levelData = game.createLevel(appState.currentLevel);
  appState.activeSelection = getDefaultSelection(game, levelData);
  renderCurrentGame();
}

function renderCurrentGame(overrideSelection) {
  helper.closeModal();
  helper.stopPreviewTimer();
  if (overrideSelection !== undefined) {
    appState.activeSelection = overrideSelection;
  }

  const game = helper.ensureGame();
  if (!game) {
    renderHome();
    return;
  }

  const levelData = game.createLevel(appState.currentLevel);
  if (appState.activeSelection === null) {
    appState.activeSelection = getDefaultSelection(game, levelData);
  }

  if (!appState.levelSolved) {
    appState.canAdvance = false;
  }
  refreshToolbar();
  helper.clearNode(appRoot);

  const screen = helper.createNode("section", "panel game-screen");
  const hero = helper.createNode("div", "game-hero");
  const meta = helper.createNode("div", "game-meta meta-card");
  meta.append(helper.createNode("p", "eyebrow", game.difficultyLabel));
  meta.append(helper.createNode("h2", null, `${game.icon} ${game.title}`));
  meta.append(helper.createNode("p", null, game.description));

  const statusRow = helper.createNode("div", "status-row");
  statusRow.append(
    helper.createNode("span", "status-chip", `Level ${appState.currentLevel}`),
    helper.createNode("span", "status-chip", `Stars ${helper.getStars(game.id)} ⭐`)
  );
  meta.append(statusRow);
  meta.append(helper.createNode("p", "hint-text", levelData.hint));

  if (game.id === "memory-path") {
    meta.append(helper.createNode("p", "helper-copy", "Wait for the preview to finish before tapping."));
  }

  hero.append(meta);

  const side = helper.createNode("div", "meta-card");
  side.append(helper.createNode("h3", null, "How to play"));
  side.append(helper.createNode("p", "helper-copy", "Use Check when you think your answer is ready. Play Again resets only this level. Next Level unlocks after a correct answer."));
  hero.append(side);
  screen.append(hero);

  const play = helper.createNode("div", "game-play");
  game.render(play, levelData, {
    onSubmit: handleSubmit,
    onRetry: handleRetry,
    onNextLevel: handleNextLevel,
    onExitToMenu: renderHome,
    setSelection(selection) {
      renderCurrentGame(selection);
    },
  });
  screen.append(play);
  screen.append(renderBottomActions());
  appRoot.append(screen);
}

function renderBottomActions() {
  const actions = helper.createNode("div", "bottom-actions");
  const retry = helper.createNode("button", "toolbar-button bottom-actions__button", "Play Again");
  const check = helper.createNode("button", "toolbar-button toolbar-button--primary bottom-actions__button bottom-actions__button--check", "Check");
  const next = helper.createNode("button", "toolbar-button toolbar-button--accent bottom-actions__button", "Next Level");

  retry.addEventListener("click", handleRetry);
  check.addEventListener("click", handleSubmit);
  next.addEventListener("click", handleNextLevel);

  retry.disabled = !appState.selectedGameId;
  check.disabled = !appState.selectedGameId || appState.levelSolved;
  next.disabled = !appState.selectedGameId || !appState.canAdvance;

  actions.append(retry, check, next);
  return actions;
}

function handleSubmit() {
  const game = helper.ensureGame();
  if (!game) {
    return;
  }

  const levelData = getCurrentLevelData();
  const isCorrect = game.checkAnswer(levelData, appState.activeSelection);
  if (isCorrect) {
    if (appState.levelSolved) {
      helper.openModal(praiseMessages[(appState.currentLevel - 1) % praiseMessages.length], "This level is already solved. Tap Next Level when you're ready.", true);
      return;
    }
    appState.canAdvance = true;
    appState.levelSolved = true;
    helper.addStars(game.id, levelData.rewardStars);
    refreshToolbar();
    helper.playTone("win");
    const messagePack = praiseMessages[(appState.currentLevel - 1) % praiseMessages.length];
    const levelCount = game.levels ? game.levels.length : 5;
    const isLastLevel = appState.currentLevel >= levelCount;
    helper.openModal(
      messagePack,
      isLastLevel ? "You finished this whole game. Tap Back Home to pick another challenge." : "You solved this level. Tap Next Level to keep going.",
      true,
      isLastLevel ? "Back Home" : "Next Level"
    );
  } else {
    helper.playTone("retry");
    const messagePack = gentleMessages[(appState.currentLevel - 1) % gentleMessages.length];
    helper.openModal(messagePack, levelData.hint, false);
  }
}

function handleRetry() {
  helper.closeModal();
  helper.stopPreviewTimer();
  const game = helper.ensureGame();
  if (!game) {
    renderHome();
    return;
  }
  appState.canAdvance = false;
  appState.levelSolved = false;
  const levelData = getCurrentLevelData();
  appState.activeSelection = getDefaultSelection(game, levelData);
  renderCurrentGame();
}

function handleNextLevel() {
  if (!appState.selectedGameId) {
    return;
  }
  helper.closeModal();
  helper.stopPreviewTimer();
  const game = helper.ensureGame();
  const levelCount = game.levels ? game.levels.length : 5;
  if (appState.currentLevel >= levelCount) {
    renderHome();
    return;
  }
  appState.currentLevel = Math.min(appState.currentLevel + 1, levelCount);
  appState.canAdvance = false;
  appState.levelSolved = false;
  const levelData = getCurrentLevelData();
  appState.activeSelection = getDefaultSelection(game, levelData);
  renderCurrentGame();
}

homeButton.addEventListener("click", renderHome);
retryButton.addEventListener("click", handleRetry);
submitButton.addEventListener("click", handleSubmit);
nextButton.addEventListener("click", handleNextLevel);
soundButton.addEventListener("click", () => {
  appState.soundEnabled = !appState.soundEnabled;
  refreshToolbar();
});
modalRetryButton.addEventListener("click", handleRetry);
modalNextButton.addEventListener("click", handleNextLevel);
resultModal.addEventListener("click", (event) => {
  if (event.target === resultModal) {
    helper.closeModal();
  }
});

refreshToolbar();
renderHome();
