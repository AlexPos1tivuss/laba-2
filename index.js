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

    case 'cd':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const targetDir = path.resolve(currentDir, args[0]);
      try {
        const stats = await fsPromises.stat(targetDir);
        if (stats.isDirectory()) {
          currentDir = targetDir;
        } else {
          console.error('Operation failed');
        }
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    case 'ls':
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        const dirs = [];
        const files = [];
        for (const entry of entries) {
          if (entry.isDirectory()) {
            dirs.push(entry.name);
          } else if (entry.isFile()) {
            files.push(entry.name);
          }
        }
        dirs.sort();
        files.sort();
        console.log('Directories:');
        dirs.forEach(dir => console.log(`  ${dir} (dir)`));
        console.log('Files:');
        files.forEach(file => console.log(`  ${file} (file)`));
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    case 'cat':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const filePath = path.resolve(currentDir, args[0]);
      try {
        const readStream = fs.createReadStream(filePath);
        await pipeline(readStream, process.stdout);
      } catch (error) {
        console.error('Operation failed');
      }
      break;

    case 'add':
      if (args.length !== 1) {
        console.error('Invalid input');
        return;
      }
      const fileName = args[0];
      const newFilePath = path.join(currentDir, fileName);
      try {
        const fd = await fsPromises.open(newFilePath, 'wx');
        await fd.close();
      } catch (error) {
        console.error('Operation failed');
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