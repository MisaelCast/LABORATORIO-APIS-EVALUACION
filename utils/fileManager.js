// fileManager.js

const fs = require('fs');
const path = require('path');

function readData(fileName) {
  const filePath = path.join(__dirname, '..', 'data', fileName);
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

function writeData(fileName, data) {
  const filePath = path.join(__dirname, '..', 'data', fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { readData, writeData };
