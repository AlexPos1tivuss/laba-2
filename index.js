const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const readline = require('readline/promises');

let username;
process.argv.forEach(arg => {
  if (arg.startsWith('--username=')) {
    username = arg.split('=')[1];
  }
});
if (!username) {
  console.error('Username not provided');
  process.exit(1);
}

let currentDir = os.homedir();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function handleCommand(command, args) {
  switch (command) {
    case 'up':
      const parentDir = path.dirname(currentDir);
      if (parentDir !== currentDir) {
        currentDir = parentDir;
      }
      break;

    default:
      console.error('Invalid input');
  }
}

async function main() {
  console.log(`Welcome to the File Manager, ${username}!`);
  console.log(`You are currently in ${currentDir}`);

  while (true) {
    const input = await rl.question('> ');
    const [command, ...args] = input.trim().split(' ');

    if (command === '.exit') {
      console.log(`Thank you for using File Manager, ${username}, goodbye!`);
      rl.close();
      process.exit(0);
    }

    try {
      await handleCommand(command, args);
    } catch (error) {
      console.error('Operation failed');
    }

    console.log(`You are currently in ${currentDir}`);
  }
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  rl.close();
  process.exit(0);
});